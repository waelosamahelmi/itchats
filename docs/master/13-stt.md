# 13 — STT (Speech-to-Text)

## Overview

The Speech-to-Text system converts user voice recordings into text for AI chat processing. It supports multiple ASR model fallbacks, language detection, and both batch (current) and streaming (planned) modes.

**Key files:**
- `packages/ai-core/src/providers/alibaba.ts` — `alibabaASR()` with two fallback phases
- `apps/api/src/ai/ai.service.ts` — `AiService.transcribeVoice()`
- `apps/api/src/ai/ai.controller.ts` — `POST /v1/ai/asr` REST endpoint

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     ASR Request Flow                            │
│                                                                 │
│  Client sends audio (base64-encoded, recorded via              │
│  MediaRecorder API → Opus/WebM blob → base64)                   │
│       │                                                        │
│       ▼                                                        │
│  POST /v1/ai/asr { audioBase64: "..." }                       │
│       │                                                        │
│       ▼                                                        │
│  AiController.asr()                                            │
│       │                                                        │
│       ▼                                                        │
│  AiService.transcribeVoice(userId, audioBase64)                │
│       │                                                        │
│       ├─ Credit check (min 6 credits)                          │
│       ├─ alibabaASR({ audioBase64 })                           │
│       │     │                                                  │
│       │     ├── Phase 1: Compatible-mode HTTP                  │
│       │     │   POST /compatible-mode/v1/audio/transcriptions  │
│       │     │   multipart/form-data: file + model              │
│       │     │   Fallback models:                               │
│       │     │     qwen3-asr-flash                              │
│       │     │     qwen3-asr-flash-2026-02-10                   │
│       │     │     paraformer-realtime-v2                       │
│       │     │                                                  │
│       │     ├── Phase 2: Native DashScope (only non-workspace) │
│       │     │   POST /api/v1/services/aigc/multimodal-         │
│       │     │         generation/generation                    │
│       │     │   JSON body: { model, input: { audio } }         │
│       │     │                                                  │
│       │     └── Returns: { text: "transcript", language: "en" }│
│       │                                                        │
│       ├─ Record generation job                                 │
│       ├─ Record usage event                                    │
│       ├─ Debit wallet                                          │
│       │                                                        │
│       ▼                                                        │
│  Return { text, language, creditsUsed }                        │
└────────────────────────────────────────────────────────────────┘
```

---

## ASR Provider: Alibaba DashScope

### Implementation

```typescript
// packages/ai-core/src/providers/alibaba.ts

interface ASRRequest {
  audioBase64: string;
  model?: string;
}

const ASR_FALLBACK_MODELS = [
  'qwen3-asr-flash',
  'qwen3-asr-flash-2026-02-10',
  'paraformer-realtime-v2',
];

export async function alibabaASR(
  request: ASRRequest,
): Promise<{ text: string; language?: string }> {
  const config = getConfig();
  const tried: string[] = [];

  // ═══════════════════════════════════════════════
  // Phase 1: Compatible-mode HTTP
  // Uses OpenAI-compatible /audio/transcriptions endpoint
  // Works with both API keys and workspace keys
  // ═══════════════════════════════════════════════
  for (const model of ASR_FALLBACK_MODELS) {
    try {
      // Decode base64 to binary audio buffer
      const audioBuffer = Buffer.from(request.audioBase64, 'base64');

      // Build multipart/form-data manually (Node.js compatible)
      const boundary = '----AlibabaASRBoundary' + Math.random().toString(36).slice(2);
      const header = [
        `--${boundary}\r\n`,
        `Content-Disposition: form-data; name="file"; filename="audio.wav"\r\n`,
        `Content-Type: audio/wav\r\n\r\n`,
      ].join('');
      const footer = [
        `\r\n--${boundary}\r\n`,
        `Content-Disposition: form-data; name="model"\r\n\r\n`,
        `${model}\r\n`,
        `--${boundary}--\r\n`,
      ].join('');

      const headerBytes = Buffer.from(header, 'utf-8');
      const footerBytes = Buffer.from(footer, 'utf-8');
      const body = Buffer.concat([headerBytes, audioBuffer, footerBytes]);

      const response = await fetchWithRetry(
        `${config.ALIBABA_BASE_URL}/audio/transcriptions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.ALIBABA_API_KEY}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
          body,
        },
        1,      // retries
        15000,  // timeout ms
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`ASR ${model} compat (${response.status}): ${errText.slice(0, 200)}`);
      }

      const data: any = await response.json();
      const text = data.text || '';

      if (!text) {
        throw new Error(`ASR ${model} compat: empty transcript`);
      }

      return {
        text,
        language: data.language,
      };

    } catch (err: any) {
      tried.push(`${model}: ${err.message.slice(0, 80)}`);
    }
  }

  // ═══════════════════════════════════════════════
  // Phase 2: Native DashScope (fallback)
  // Uses multimodal-generation endpoint
  // Works only with non-workspace API keys
  // ═══════════════════════════════════════════════
  if (!isWorkspaceKey()) {
    for (const model of ASR_FALLBACK_MODELS) {
      try {
        const nativeBase = getNativeBase();
        if (!nativeBase) continue;

        const response = await fetchWithRetry(
          `${nativeBase}/aigc/multimodal-generation/generation`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${config.ALIBABA_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              input: { audio: request.audioBase64 },
            }),
          },
          2,
          15000,
        );

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          throw new Error(`ASR ${model} native (${response.status}): ${errText.slice(0, 200)}`);
        }

        const data: any = await response.json();
        const text = data.output?.text
          || data.output?.transcript
          || data.text
          || '';

        if (text) {
          return {
            text,
            language: data.output?.language,
          };
        }

        tried.push(`${model}: empty transcript`);

      } catch (err: any) {
        tried.push(`${model}: ${err.message.slice(0, 80)}`);
      }
    }
  }

  throw new Error(`All ASR models exhausted. Tried: ${tried.join(' | ')}`);
}
```

### Key Design Decisions

1. **Manual multipart construction:** Avoids dependency on `form-data` npm package. Builds the multipart body with raw `Buffer.concat()`.

2. **Two-phase fallback:** Compatible-mode first (works with all API keys), native DashScope second (higher quality but key-restricted).

3. **Workspace key detection:** `isWorkspaceKey()` checks if `ALIBABA_API_KEY` starts with `sk-ws-`. Workspace keys cannot use native DashScope endpoints.

4. **Error accumulation:** Each failed model attempt is recorded in `tried[]`. The final error includes all attempts for debugging.

---

## Service Layer

### AiService.transcribeVoice()

```typescript
// apps/api/src/ai/ai.service.ts

async transcribeVoice(userId: string, audioBase64: string) {
  const db = getDb();

  // 1. Credit check
  const wallet = await db.select().from(creditWallets)
    .where(eq(creditWallets.userId, userId)).limit(1);
  const balance = wallet[0]?.balance ?? 0;
  const cost = Math.max(
    getCreditCost('qwen3-asr-flash', 'asr', { seconds: 30 }),
    6,  // Minimum 6 credits
  );

  if (balance < cost) {
    throw new Error(`Insufficient credits: need ${cost}, have ${balance}`);
  }

  // 2. Call ASR provider
  const result = await alibabaASR({ audioBase64 });

  // 3. Record generation job
  const [job] = await db.insert(generationJobs).values({
    userId,
    generationType: 'asr',
    routeKey: 'asr.standard',
    idempotencyKey: randomUUID(),
    requestJson: { audioLength: audioBase64.length },
    status: 'succeeded',
    responseJson: { language: result.language },
    completedAt: new Date(),
  }).returning();

  // 4. Record usage event
  await db.insert(usageEvents).values({
    userId,
    generationJobId: job.id,
    providerId: 'alibaba',
    generationType: 'asr',
    audioSeconds: '30',           // Estimated (fixed for now)
    providerCostUsd: '0.00105',
    creditsDebited: cost,
    pricingSnapshot: {
      model: 'qwen3-asr-flash',
      credits: cost,
      estimatedSeconds: 30,
    },
  });

  // 5. Debit wallet
  await db.update(creditWallets).set({
    balance: sql`GREATEST(0, ${creditWallets.balance} - ${cost})`,
    lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${cost}`,
    updatedAt: new Date(),
  }).where(eq(creditWallets.userId, userId));

  return {
    text: result.text,
    language: result.language,
    creditsUsed: cost,
  };
}
```

### REST Endpoint

```typescript
// apps/api/src/ai/ai.controller.ts

@Post('asr')
@UseGuards(JwtAuthGuard)
async asr(
  @Body() body: { audioBase64: string },
  @Req() req: any,
) {
  try {
    const result = await this.aiService.transcribeVoice(
      req.user.userId,
      body.audioBase64,
    );
    return result;
  } catch {
    return { error: 'Transcription failed. Please try again.' };
  }
}
```

---

## Language Detection

The ASR models return a `language` field in the response:

```typescript
interface ASRResponse {
  text: string;           // "Hello, how are you?"
  language?: string;      // "en", "zh", "ja", "ko", "fr", etc.
}
```

Supported languages (qwen3-asr-flash):
- English (`en`)
- Chinese/Mandarin (`zh`)
- Japanese (`ja`)
- Korean (`ko`)
- French (`fr`)
- German (`de`)
- Spanish (`es`)
- Portuguese (`pt`)
- Italian (`it`)
- Russian (`ru`)
- And more (multilingual model)

### Language-Based Routing

The detected language can influence downstream behavior:

```typescript
// Proposed: Route to different system prompts based on language
async transcribeAndRoute(userId: string, audioBase64: string, characterId: string) {
  const { text, language } = await this.transcribeVoice(userId, audioBase64);

  // Update character's current interaction language
  if (language && language !== 'en') {
    await db.update(characters)
      .set({ defaultLanguage: language })
      .where(eq(characters.id, characterId));
  }

  // Pass language hint to chat engine
  return { text, language };
}
```

---

## Batch vs. Streaming

### Current: Batch Mode

The current implementation is fully batch:
1. Client records entire audio clip
2. Client encodes to base64
3. Client sends complete audio in one HTTP request
4. Server processes and returns transcription

**Pros:**
- Simple implementation
- Works with standard REST
- No WebSocket required
- Low server complexity

**Cons:**
- High latency (wait for full recording + upload + processing)
- No real-time feedback
- Memory overhead for large audio files
- Not suitable for voice calls

```
Timeline (batch, 5-second recording):
  0.0s ─── Recording (5s)
  5.0s ─── Encode base64 (0.2s)
  5.2s ─── Upload to server (0.5s)
  5.7s ─── ASR processing (1.0s)
  6.7s ─── Return transcription
  Total: ~6.7 seconds latency
```

### Target: Streaming Mode

For real-time voice calls and live transcription, the system should support streaming ASR:

```typescript
// Proposed: Streaming ASR via WebSocket

// Client sends audio chunks in real-time
ws.send(JSON.stringify({
  type: 'asr:chunk',
  callId: '...',
  audioBase64: '<small chunk of audio>',
  isFinal: false,
}));

// Server returns incremental transcriptions
ws.on('message', (data) => {
  const msg = JSON.parse(data);
  // {
  //   type: 'asr:partial',
  //   text: 'Hello, how...',    // Partial, may change
  //   isFinal: false,
  // }
  // {
  //   type: 'asr:final',
  //   text: 'Hello, how are you?',
  //   language: 'en',
  //   isFinal: true,
  // }
});
```

#### Streaming with DashScope Realtime API

DashScope's `paraformer-realtime-v2` model supports streaming via WebSocket:

```typescript
// Proposed: Streaming ASR client
async function* streamingASR(audioStream: AsyncIterable<Buffer>): AsyncIterable<{
  text: string;
  isFinal: boolean;
}> {
  const ws = new WebSocket(
    'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime?model=paraformer-realtime-v2',
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );

  const taskId = crypto.randomUUID();

  ws.on('open', () => {
    // Start ASR task
    ws.send(JSON.stringify({
      header: { action: 'run-task', task_id: taskId, streaming: 'duplex' },
      payload: {
        task_group: 'audio',
        task: 'asr',
        function: 'SpeechRecognizer',
        model: 'paraformer-realtime-v2',
        parameters: { format: 'pcm', sample_rate: 16000 },
      },
    }));
  });

  // Send audio chunks as they arrive
  for await (const chunk of audioStream) {
    ws.send(chunk);  // Binary PCM data
  }

  // Signal end of audio
  ws.send(JSON.stringify({
    header: { action: 'finish-task', task_id: taskId },
    payload: {},
  }));

  // Receive transcription results
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.header?.action === 'task-finished') {
      yield {
        text: msg.payload?.output?.text || '',
        isFinal: true,
      };
    }
    // Partial results during recognition
    if (msg.payload?.output?.text) {
      yield {
        text: msg.payload.output.text,
        isFinal: false,
      };
    }
  });
}
```

---

## Audio Format Requirements

### Current (Batch via HTTP)

| Parameter      | Value                              |
|----------------|------------------------------------|
| Format         | WAV, MP3, WebM, or any browser-compatible audio |
| Encoding       | Base64 string                      |
| Sample rate    | Any (provider auto-detects)        |
| Channels       | Mono or stereo                     |
| Max duration   | ~60 seconds (HTTP timeout limit)   |
| Max size       | ~5MB (base64 encoded)             |

### Client-Side Recording

```typescript
// Typical browser recording setup
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus',
});

const chunks: Blob[] = [];
mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
mediaRecorder.onstop = async () => {
  const blob = new Blob(chunks, { type: 'audio/webm' });
  const base64 = await blobToBase64(blob);

  // Send to server
  const response = await fetch('/v1/ai/asr', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ audioBase64: base64 }),
  });

  const { text, language } = await response.json();
};
```

### Target (Streaming via WebSocket)

| Parameter      | Value                              |
|----------------|------------------------------------|
| Format         | PCM 16-bit signed, little-endian   |
| Sample rate    | 16000 Hz (recommended)             |
| Channels       | Mono (1 channel)                   |
| Chunk size     | ~200ms of audio per chunk          |
| Transport      | WebSocket binary frames            |

---

## Pricing

| Model                      | Cost Basis       | Provider Rate    | Credit Rate       |
|----------------------------|------------------|------------------|-------------------|
| qwen3-asr-flash            | Per second       | $0.000035/sec    | ~6 credits/req    |
| paraformer-realtime-v2     | Per second       | $0.000035/sec    | ~6 credits/req    |

### Cost Calculation

```typescript
// packages/ai-core/src/costing.ts

case 'asr': {
  const seconds = Number(params.seconds ?? 30);
  return (pricing as number) * seconds;
}

// For a 10-second recording:
// getCreditCost('qwen3-asr-flash', 'asr', { seconds: 10 })
// = calculateCredits(0.000035 * 10)
// = Math.ceil((0.00035 * 1.25 / 0.25) / 0.001)
// ≈ 2 → floored to 2 (minimum)

// For a 30-second recording:
// ≈ 6 credits
```

### Usage Tracking

```typescript
await db.insert(usageEvents).values({
  userId,
  generationJobId: job.id,
  providerId: 'alibaba',
  generationType: 'asr',
  audioSeconds: '30',           // Fixed estimate for now
  // TODO: Calculate actual duration from audio buffer
  providerCostUsd: '0.00105',   // 30s * $0.000035
  creditsDebited: cost,
  pricingSnapshot: {
    model: 'qwen3-asr-flash',
    credits: cost,
    estimatedSeconds: 30,
  },
});
```

**Improvement needed:** The current implementation uses a fixed 30-second estimate for billing. Actual audio duration should be calculated from the audio buffer:

```typescript
// Proposed: Calculate actual audio duration
function getAudioDurationSeconds(base64Audio: string): number {
  const buffer = Buffer.from(base64Audio, 'base64');
  // Approximate from WAV header or file size
  // Assuming 16-bit mono 16kHz: bytes = duration * 16000 * 2
  // Or use a library like 'music-metadata'
  const estimatedBytesPerSecond = 16000 * 2; // 16kHz, 16-bit, mono
  return buffer.length / estimatedBytesPerSecond;
}
```

---

## Error Handling & Resilience

1. **Model exhaustion:** If all 3 models fail in Phase 1 AND all 3 fail in Phase 2, throw comprehensive error with all attempt details.

2. **Empty transcripts:** The system rejects empty `text` responses and tries the next model.

3. **Network issues:** `fetchWithRetry()` includes retry logic with exponential backoff (500ms increments).

4. **Workspace key compatibility:** Workspace keys (`sk-ws-*`) skip Phase 2 (native DashScope) and only attempt Phase 1 (compatible mode).

5. **Timeout protection:** Each fetch has a 15-second timeout to prevent hanging.

6. **Credit check:** Happens before any API call, so users are never charged for failed transcriptions.

---

## Testing

### Manual Test

```bash
# Record a short WAV file and base64-encode it
# (on macOS/Linux):
rec -t wav -r 16000 -c 1 -b 16 test.wav trim 0 3
BASE64=$(base64 -i test.wav)

# Send to ASR endpoint
curl -X POST http://localhost:3001/v1/ai/asr \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"audioBase64\": \"$BASE64\"}"

# Response:
# { "text": "hello world", "language": "en", "creditsUsed": 6 }
```

### Mock Provider for Testing

```typescript
// For integration tests, mock alibabaASR
jest.mock('@itchats/ai-core', () => ({
  alibabaASR: jest.fn().mockResolvedValue({
    text: 'This is a test transcript',
    language: 'en',
  }),
}));
```

---

## Future Enhancements

1. **Actual audio duration calculation** — Replace fixed 30-second estimate with real duration from audio metadata.

2. **Streaming ASR for voice calls** — Implement WebSocket-based streaming with `paraformer-realtime-v2`.

3. **Speaker diarization** — Identify different speakers in multi-person audio.

4. **Punctuation & capitalization** — Post-process ASR output for readability.

5. **Language auto-detection with fallback** — Route to language-specific system prompts.

6. **Noise suppression** — Client-side audio preprocessing before sending to ASR.

7. **Word-level timestamps** — For lip-sync in future avatar features.

---

## Dependencies

```
ASR Flow
  ├── alibabaASR()                     (packages/ai-core)
  │     ├── Phase 1: /audio/transcriptions   (compatible HTTP)
  │     │     └── Models: qwen3-asr-flash, paraformer-realtime-v2
  │     └── Phase 2: /aigc/multimodal-generation (native DashScope)
  ├── getCreditCost('qwen3-asr-flash') (packages/ai-core/costing)
  └── DB: generationJobs, usageEvents, creditWallets
```
