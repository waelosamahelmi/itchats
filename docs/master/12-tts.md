# 12 — TTS (Text-to-Speech)

## Overview

The TTS system converts AI character text responses into natural-sounding speech. It supports two engine tiers: the instruction-based `qwen3-tts-instruct-flash` for expressive, persona-driven voices, and the simpler `qwen3-tts-flash` for basic speech. Voice profiles map to character personalities, and emotion hints modulate delivery.

**Key files:**
- `packages/ai-core/src/providers/alibaba.ts` — `alibabaTTS()`, `alibabaTTSWithFallback()`, voice profiles, WebSocket fallback
- `apps/api/src/ai/ai.controller.ts` — REST endpoints (`POST /v1/ai/tts`, `POST /v1/ai/voice-preview`)
- `apps/api/src/ai/ai.service.ts` — `AiService.generateVoice()`
- `packages/ai-core/src/prompts/voice.prompt.ts` — Target location for voice instruction builders

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     TTS Request Flow                            │
│                                                                 │
│  Client Request                                                 │
│  POST /v1/ai/tts { text, voice?, emotion? }                    │
│       │                                                        │
│       ▼                                                        │
│  AiController.tts()                                            │
│       │                                                        │
│       ├─ Cache hit? (preview mode) → return cached audio       │
│       │                                                        │
│       ▼                                                        │
│  AiService.generateVoice(userId, text, voice)                  │
│       │                                                        │
│       ├─ Credit check                                          │
│       ├─ alibabaTTS({ text, voice, ... })                      │
│       │     │                                                  │
│       │     ├─ voice in VOICE_PROFILES?                          │
│       │     │   YES → qwen3-tts-instruct-flash + instruction    │
│       │     │   NO  → qwen3-tts-flash (compat cherry/stella)    │
│       │     │                                                  │
│       │     ▼                                                  │
│       │   DashScope multimodal-generation API                  │
│       │   POST /api/v1/services/aigc/multimodal-generation     │
│       │   → download audio URL                                 │
│       │   → return base64 + format (mp3)                       │
│       │                                                        │
│       ├─ Record generation job                                 │
│       ├─ Record usage event                                    │
│       ├─ Debit wallet                                          │
│       │                                                        │
│       ▼                                                        │
│  Return { audioBase64, format, creditsUsed }                   │
└────────────────────────────────────────────────────────────────┘
```

---

## TTS Provider: Alibaba DashScope

### Engine Tier 1: qwen3-tts-instruct-flash (Primary)

The instruction-based model accepts a natural-language voice description alongside the text. This is the primary engine for character voices — it produces the most natural, persona-consistent speech.

```typescript
// packages/ai-core/src/providers/alibaba.ts

async function callTTSCompat(
  model: string,
  request: TTSRequest,
  config: ReturnType<typeof getConfig>,
): Promise<AudioResult> {
  const nativeBase = getNativeBase();

  // ── Instruct path: character voice profiles ──
  if (request.voice && TTS_VOICE_PROFILES[request.voice]) {
    const profile = TTS_VOICE_PROFILES[request.voice];

    // CRITICAL: Gender MUST come first for the model to obey
    const genderTag = profile.explicitGender === 'male'
      ? 'SPEAK WITH A MALE VOICE.'
      : 'SPEAK WITH A FEMALE VOICE.';

    const instructText = [
      genderTag,
      `Voice style: ${profile.instruction}.`,
      `Emotion: ${request.emotion || 'neutral'}.`,
      `Say this naturally: ${request.text}`,
    ].join(' ');

    const response = await fetchWithRetry(
      `${nativeBase}/aigc/multimodal-generation/generation`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.ALIBABA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen3-tts-instruct-flash',
          input: { text: instructText },
          parameters: {
            format: 'mp3',
            speed: request.speed ?? 1.0,
          },
        }),
      },
      1,
      30000,
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`TTS instruct (${response.status}): ${errText.slice(0, 200)}`);
    }

    const data: any = await response.json();
    const audioUrl = data.output?.audio?.url;
    if (!audioUrl) throw new Error('TTS instruct: no audio URL');

    // Download the generated audio
    const audioRes = await fetchWithRetry(audioUrl, {}, 1, 15000);
    if (!audioRes.ok) throw new Error(`TTS instruct: download failed (${audioRes.status})`);

    const arrayBuffer = await audioRes.arrayBuffer();
    if (arrayBuffer.byteLength === 0) throw new Error('TTS instruct: empty audio');

    return {
      audioBase64: Buffer.from(arrayBuffer).toString('base64'),
      format: 'mp3',
    };
  }

  // ── Fallback path: simple voice keys ──
  const voice = request.voice && TTS_COMPAT_VOICES.includes(request.voice)
    ? request.voice
    : TTS_COMPAT_VOICES[0];  // 'cherry'

  const response = await fetchWithRetry(
    `${nativeBase}/aigc/multimodal-generation/generation`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.ALIBABA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen3-tts-flash',
        input: { text: request.text },
        parameters: { voice, format: 'mp3' },
      }),
    },
    1,
    30000,
  );

  // ... parse response, download audio, return base64
}
```

### Engine Tier 2: qwen3-tts-flash (Simple, Fast)

A simpler TTS model with preset voices (`cherry`, `stella`). Used as fallback when no character voice profile is configured.

```typescript
const TTS_COMPAT_VOICES = ['cherry', 'stella'];

// Parameters: { model: 'qwen3-tts-flash', input: { text }, parameters: { voice, format: 'mp3' } }
```

### Engine Tier 3: WebSocket Legacy (Deprecated)

The original TTS implementation used a WebSocket connection to DashScope's real-time API. This is retained as a fallback but is not the primary path:

```typescript
async function callTTS(model, request, apiKey): Promise<AudioResult> {
  // WebSocket to wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime
  // Sends: run-task → continue-task → finish-task
  // Collects binary audio chunks from WS messages
  // Returns concatenated audio as base64
}
```

### Fallback Chain

```typescript
const TTS_FALLBACK_MODELS = [
  'qwen3-tts-instruct-flash',
  'qwen3-tts-flash',
];

export async function alibabaTTSWithFallback(request: TTSRequest):
  Promise<AudioResult & { usedModel: string }> {
  for (const model of TTS_FALLBACK_MODELS) {
    try {
      const result = await callTTSCompat(model, request, config);
      return { ...result, usedModel: model };
    } catch (err) {
      tried.push(`${model}: ${err.message.slice(0, 80)}`);
    }
  }
  throw new Error(`All TTS models exhausted.`);
}
```

---

## Voice Profiles

### Complete Profile Registry

```typescript
const TTS_VOICE_PROFILES: Record<string, {
  label: string;
  gender: string;
  accent: string;
  instruction: string;
  explicitGender: string;
}> = {
  // ── Female Voices ──
  aria: {
    label: 'Aria',
    gender: 'female',
    accent: 'American',
    instruction: 'bright, energetic, young American female voice, cheerful and bubbly, modern Gen-Z style',
    explicitGender: 'female',
  },
  stella: {
    label: 'Stella',
    gender: 'female',
    accent: 'British',
    instruction: 'elegant, refined British female voice, calm and sophisticated, like a BBC presenter',
    explicitGender: 'female',
  },
  luna: {
    label: 'Luna',
    gender: 'female',
    accent: 'American',
    instruction: 'soft, gentle, whispery female voice, warm and intimate, ASMR quality, slow pace',
    explicitGender: 'female',
  },
  iris: {
    label: 'Iris',
    gender: 'female',
    accent: 'American',
    instruction: 'mature, wise female voice, motherly and reassuring, clear American accent, calm tone',
    explicitGender: 'female',
  },
  sage: {
    label: 'Sage',
    gender: 'female',
    accent: 'American',
    instruction: 'casual, laid-back female voice, slightly husky, California style, relaxed and cool',
    explicitGender: 'female',
  },

  // ── Male Voices ──
  marcus: {
    label: 'Marcus',
    gender: 'male',
    accent: 'American',
    instruction: 'warm, deep, resonant American male voice, like a podcast host, friendly and confident',
    explicitGender: 'male',
  },
  james: {
    label: 'James',
    gender: 'male',
    accent: 'British',
    instruction: 'deep, authoritative British male voice, commanding and confident, like a movie narrator, very deep pitch',
    explicitGender: 'male',
  },
  theo: {
    label: 'Theo',
    gender: 'male',
    accent: 'American',
    instruction: 'young, energetic American male voice, upbeat and friendly, Gen-Z style, natural male tone',
    explicitGender: 'male',
  },
  oliver: {
    label: 'Oliver',
    gender: 'male',
    accent: 'British',
    instruction: 'warm, gentle British male voice, kind and thoughtful, like a teacher, soft-spoken man',
    explicitGender: 'male',
  },
};
```

### Legacy (DashScope WebSocket) Voice Map

These are the older voice keys used by the WebSocket TTS path:

```typescript
const TTS_VOICES: Record<string, { label: string; gender: string; style: string; desc: string }> = {
  longanlingxi: { label: 'Emily',   gender: 'female', style: 'Warm',   desc: 'Soft, natural — warm companion' },
  longxiaochun:  { label: 'Claire', gender: 'female', style: 'Gentle', desc: 'Calm, tender — close listener' },
  longxiaoxia:   { label: 'Maya',   gender: 'female', style: 'Bright', desc: 'Cheerful, lively — social spark' },
  longxiaobai:   { label: 'Lily',   gender: 'female', style: 'Cute',   desc: 'Sweet, playful — youthful charm' },
  longyuer:      { label: 'Sophie', gender: 'female', style: 'Mature', desc: 'Elegant, calm — narrative voice' },
  longshu:       { label: 'James',  gender: 'male',   style: 'Deep',   desc: 'Rich, smooth — commanding tone' },
  longshao:      { label: 'Daniel', gender: 'male',   style: 'Warm',   desc: 'Friendly, welcoming — easy talk' },
  longcheng:     { label: 'Alex',   gender: 'male',   style: 'Clear',  desc: 'Crisp, professional — business voice' },
};
```

---

## Emotion Mapping

### Emotion → Vocal Delivery Instructions

Emotion hints modify the TTS instruct prompt to modulate vocal delivery:

```typescript
type TTSemotion = 'happy' | 'sad' | 'angry' | 'fearful'
  | 'surprised' | 'disgusted' | 'neutral';

function getEmotionGuidance(emotion: TTSemotion): string {
  switch (emotion) {
    case 'happy':
      return 'cheerful and bright, smiling voice, upbeat energy, slightly faster pace';
    case 'sad':
      return 'gentle and subdued, slightly slower pace, soft tone, melancholic warmth';
    case 'angry':
      return 'firm and intense, sharper articulation, controlled anger, slightly louder';
    case 'fearful':
      return 'hesitant and soft, slightly breathy, nervous energy, quicker pace';
    case 'surprised':
      return 'bright and expressive, slightly higher pitch, energetic, genuine surprise';
    case 'disgusted':
      return 'slightly dismissive tone, flat affect, subtle edge';
    case 'neutral':
    default:
      return 'neutral, conversational, natural speaking voice';
  }
}
```

### Automatic Emotion Detection

For character voice generation, the system auto-detects the emotional tone of the AI response text:

```typescript
// Regex-based emotion detection (from pipeline orchestrator)
function detectEmotion(text: string): TTSemotion {
  const lower = text.toLowerCase();
  if (lower.match(/!{2,}|awesome|amazing|wow|yay|love/)) return 'happy';
  if (lower.match(/:\(|sorry|sad|miss|cry|unfortunately/)) return 'sad';
  if (lower.match(/no!|stop|angry|frustrat|ugh/)) return 'angry';
  if (lower.match(/really\?|what\?|omg|wait/)) return 'surprised';
  return 'neutral';
}
```

**Future enhancement:** Use an LLM call (`qwen-flash`, cheap) to classify emotion more accurately:

```typescript
// Proposed LLM-based emotion detection
const emotionPrompt = `Classify the emotional tone of this text.
Return ONLY one word: happy, sad, angry, fearful, surprised, disgusted, or neutral.

Text: "${aiResponse}"`;

const result = await alibabaChat({
  messages: [{ role: 'user', content: emotionPrompt }],
  model: 'qwen-flash',
  temperature: 0.1,
  maxTokens: 10,
});
```

---

## Voice Assignment Per Character

### Schema

The `characters` table has a `ttsVoice` column (`NEW` per `02-database.md`) and a `character_voice_profiles` table:

```sql
-- characters table
ttsVoice TEXT;  -- Voice profile key (e.g., 'aria', 'marcus')

-- character_voice_profiles table
CREATE TABLE character_voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  characterId UUID NOT NULL REFERENCES characters(id),
  providerId TEXT,       -- 'alibaba'
  modelKey TEXT,         -- 'qwen3-tts-instruct-flash'
  voiceKey TEXT,         -- 'aria', 'marcus', etc.
  language TEXT,         -- 'en'
  speed TEXT,            -- '1.0'
  pitch TEXT,            -- '1.0'
  style JSONB,           -- { emotion: 'neutral', ... }
  previewMediaId UUID,
  active TEXT,           -- 'true'
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Default Voice Assignment Logic

```typescript
/**
 * Assign a default voice to a character based on their gender, age, and personality.
 * Called during character creation and can be overridden by the creator.
 */
function assignDefaultVoice(character: {
  gender?: string | null;
  ageDisplay?: string | null;
  personality?: string | null;
}): string {
  const gender = (character.gender || '').toLowerCase();
  const personality = (character.personality || '').toLowerCase();
  const ageDisplay = (character.ageDisplay || '').toLowerCase();

  // ── Female character → female voices ──
  if (gender === 'female' || gender === 'woman' || gender === 'non-binary') {
    if (personality.includes('energetic') || personality.includes('bubbly')
        || ageDisplay.includes('early') || ageDisplay.includes('teen')) {
      return 'aria';   // Bright Gen-Z
    }
    if (personality.includes('elegant') || personality.includes('sophisticated')
        || personality.includes('formal') || personality.includes('proper')) {
      return 'stella'; // British refined
    }
    if (personality.includes('soft') || personality.includes('gentle')
        || personality.includes('shy') || personality.includes('quiet')) {
      return 'luna';   // Soft, ASMR
    }
    if (personality.includes('wise') || personality.includes('mature')
        || personality.includes('motherly') || ageDisplay.includes('40')
        || ageDisplay.includes('50') || ageDisplay.includes('60')) {
      return 'iris';   // Mature, wise
    }
    if (personality.includes('casual') || personality.includes('laid-back')
        || personality.includes('cool') || personality.includes('chill')) {
      return 'sage';   // California casual
    }
    return 'aria'; // Default female
  }

  // ── Male character → male voices ──
  if (gender === 'male' || gender === 'man') {
    if (personality.includes('young') || personality.includes('energetic')
        || ageDisplay.includes('early') || ageDisplay.includes('teen')) {
      return 'theo';    // Young Gen-Z male
    }
    if (personality.includes('warm') || personality.includes('friendly')
        || personality.includes('confident') || personality.includes('outgoing')) {
      return 'marcus';  // Podcast host
    }
    if (personality.includes('authoritative') || personality.includes('deep')
        || personality.includes('formal') || personality.includes('serious')) {
      return 'james';   // Movie narrator
    }
    if (personality.includes('gentle') || personality.includes('kind')
        || personality.includes('teacher') || personality.includes('soft-spoken')) {
      return 'oliver';  // Gentle teacher
    }
    return 'marcus'; // Default male
  }

  // ── Unspecified gender → default female ──
  return 'aria';
}
```

### Character Voice Profile Management

```typescript
// apps/api/src/voice/voice-profile.service.ts

@Injectable()
export class VoiceProfileService {
  /**
   * Get the active TTS voice for a character.
   * Falls back to the character's ttsVoice column, then default assignment.
   */
  async getActiveVoice(characterId: string): Promise<VoiceProfile> {
    const db = getDb();

    // 1. Check character_voice_profiles for active profile
    const [profile] = await db.select().from(characterVoiceProfiles)
      .where(and(
        eq(characterVoiceProfiles.characterId, characterId),
        eq(characterVoiceProfiles.active, 'true'),
      ))
      .limit(1);

    if (profile) {
      const voiceProfile = TTS_VOICE_PROFILES[profile.voiceKey];
      if (voiceProfile) return voiceProfile;
    }

    // 2. Fall back to character.ttsVoice column
    const [char] = await db.select({
      ttsVoice: characters.ttsVoice,
      gender: characters.gender,
      ageDisplay: characters.ageDisplay,
      personality: characters.personality,
    }).from(characters).where(eq(characters.id, characterId)).limit(1);

    if (char?.ttsVoice) {
      const voiceProfile = TTS_VOICE_PROFILES[char.ttsVoice];
      if (voiceProfile) return voiceProfile;
    }

    // 3. Assign default based on character traits
    const defaultKey = assignDefaultVoice({
      gender: char?.gender,
      ageDisplay: char?.ageDisplay,
      personality: char?.personality,
    });

    return TTS_VOICE_PROFILES[defaultKey] || TTS_VOICE_PROFILES['aria'];
  }

  /**
   * Update the voice profile for a character.
   */
  async setVoice(characterId: string, voiceKey: string): Promise<void> {
    const db = getDb();

    if (!TTS_VOICE_PROFILES[voiceKey]) {
      throw new Error(`Unknown voice: ${voiceKey}`);
    }

    await db.transaction(async (tx) => {
      // Deactivate all existing profiles
      await tx.update(characterVoiceProfiles)
        .set({ active: 'false', updatedAt: new Date() })
        .where(eq(characterVoiceProfiles.characterId, characterId));

      // Insert new active profile
      await tx.insert(characterVoiceProfiles).values({
        characterId,
        providerId: 'alibaba',
        modelKey: 'qwen3-tts-instruct-flash',
        voiceKey,
        language: 'en',
        speed: '1.0',
        pitch: '1.0',
        style: { emotion: 'neutral' },
        active: 'true',
      });
    });

    // Update character's ttsVoice for quick lookup
    await db.update(characters)
      .set({ ttsVoice: voiceKey, updatedAt: new Date() })
      .where(eq(characters.id, characterId));
  }

  /**
   * Get all available voices for UI display.
   */
  getAvailableVoices() {
    return TTS_VOICES_LIST.map(v => ({
      id: v.id,
      label: v.label,
      gender: v.gender,
      accent: v.accent,
      description: v.desc,
    }));
  }
}
```

---

## Voice Preview (Caching)

The API provides an endpoint to preview a voice without incurring costs on every call:

```typescript
// apps/api/src/ai/ai.controller.ts

const ttsCache = new Map<string, { audioBase64: string; format: string }>();
const TTS_SAMPLE = 'Hello! I am an AI character.';

@Post('tts')
async tts(@Body() body: { text: string; voice?: string; emotion?: string }, @Req() req: any) {
  const voice = body.voice ?? 'Cherry';
  const isPreview = body.text === TTS_SAMPLE && !body.emotion;

  // Cache hit: return cached preview
  if (isPreview) {
    const cached = ttsCache.get(voice);
    if (cached) return cached;
  }

  const result = await this.aiService.generateVoice(req.user.userId, body.text, voice);

  // Cache the preview
  if (isPreview) {
    ttsCache.set(voice, { audioBase64: result.audioUrl, format: result.format });
  }

  return { audioBase64: result.audioUrl, format: result.format, creditsUsed: result.creditsUsed };
}

@Post('voice-preview')
async voicePreview(@Body() body: { voice: string; text?: string }) {
  const text = body.text ?? TTS_SAMPLE;
  const cacheKey = `${body.voice}:${text}`;
  const cached = ttsCache.get(cacheKey);
  if (cached) return cached;

  const audio = await alibabaTTS({ text, voice: body.voice, model: 'qwen-tts' });
  const result = { audioBase64: audio.audioBase64, format: audio.format };
  ttsCache.set(cacheKey, result);
  return result;
}
```

Caching strategy:
- In-memory `Map` (cleared on server restart)
- Keyed by voice ID + sample text
- No expiry (samples are static)
- Future: Redis-backed for multi-instance deployments

---

## Billing

### Pricing

| Model                      | Cost Basis      | Provider Rate    | Credit Rate      |
|----------------------------|-----------------|------------------|------------------|
| qwen3-tts-flash            | Per 10K chars   | $0.13            | ~3 credits/msg   |
| qwen3-tts-flash-realtime   | Per 10K chars   | $0.13            | ~3 credits/msg   |

### Cost Calculation

```typescript
// packages/ai-core/src/costing.ts

case 'tts': {
  const chars = Number(params.chars ?? 300);
  return (pricing as number) * chars / 10_000;
}

// Minimum: 2 credits
export function getCreditCost(model, capability, params = {}): number {
  const providerCost = getEstimatedCost(model, capability, params);
  const credits = calculateCredits(providerCost);
  return Math.max(credits, 2);
}
```

### Usage Tracking

```typescript
await db.insert(usageEvents).values({
  userId,
  generationJobId: job.id,
  providerId: 'alibaba',
  generationType: 'tts',
  inputCharacters: text.length,      // Track characters for cost analysis
  providerCostUsd: '0.002',
  creditsDebited: cost,
  pricingSnapshot: {
    model: voice || 'qwen3-tts-flash',
    credits: cost,
  },
});
```

---

## TTS Quality Dimensions

### Speed

Adjustable from 0.5x to 2.0x via the `speed` parameter. Default is 1.0.

```typescript
parameters: {
  format: 'mp3',
  speed: request.speed ?? 1.0,   // 0.5–2.0
}
```

### Sample Rate & Format

- Output format: MP3
- Via WebSocket legacy: 22050 Hz sample rate, mono
- Via instruct/flash: Provider default (typically 24kHz or 48kHz)

### Character Limit

The `text` parameter is not explicitly capped by the API — however, practical limits:
- TTS generation time scales linearly with text length
- HTTP timeout is 30 seconds
- Recommended: < 500 characters per request
- For longer text, split into sentences and generate sequentially

---

## Testing & Debugging

### Manual Test

```bash
# Test with curl
curl -X POST http://localhost:3001/v1/ai/tts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hey! How are you doing today?", "voice": "aria"}'

# Response: { "audioBase64": "...", "format": "mp3", "creditsUsed": 3 }
```

### Voice Preview Without Authentication

```bash
# Preview endpoint (requires auth)
curl -X POST http://localhost:3001/v1/ai/voice-preview \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"voice": "marcus"}'
```

---

## Dependencies

```
TTS Flow
  ├── alibabaTTS()                     (packages/ai-core)
  │     ├── callTTSCompat()
  │     │     ├── qwen3-tts-instruct-flash (primary, voice profiles)
  │     │     └── qwen3-tts-flash         (fallback, cherry/stella)
  │     └── callTTS()                    (legacy WebSocket)
  ├── getCreditCost('qwen3-tts-flash')  (packages/ai-core/costing)
  ├── VoiceProfileService               (apps/api, proposed)
  ├── DB: generationJobs, usageEvents, creditWallets, creditLedger,
  │       characterVoiceProfiles, characters.ttsVoice
  └── Cache: in-memory Map (voice previews)
```
