# 11 — Voice Calls

## Overview

Voice calls enable real-time spoken conversations between users and AI characters. The pipeline is: Speech-to-Text (STT) → LLM chat → Text-to-Speech (TTS). Calls are full-duplex with interruption handling — the user can interrupt the AI mid-speech.

**Current state (MVP):** Voice messages only — the user records audio, sends it via `POST /v1/ai/asr`, receives transcription, sends text to chat, and optionally plays a TTS response. No real-time calling yet.

**Target state:** WebRTC-based real-time voice calls with streaming STT, streaming LLM, streaming TTS, and barge-in interruption.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Web/Mobile)                       │
│                                                                  │
│  ┌──────────┐    ┌─────────────┐    ┌──────────┐               │
│  │ Mic      │───▶│ Audio Encoder│───▶│ WebRTC   │               │
│  │ Capture  │    │ (Opus)      │    │ Peer     │               │
│  └──────────┘    └─────────────┘    └────┬─────┘               │
│                                          │                      │
│  ┌──────────┐    ┌─────────────┐    ┌────▼─────┐               │
│  │ Speaker  │◀───│ Audio Decoder│◀───│ WebRTC   │               │
│  │ Playback │    │ (Opus)      │    │ Peer     │               │
│  └──────────┘    └─────────────┘    └──────────┘               │
│                                                                  │
│  ┌──────────────────────────────────────────┐                   │
│  │           Call State Machine              │                   │
│  │  idle → ringing → connected → ended      │                   │
│  │               ↓                          │                   │
│  │         user_talking / ai_talking         │                   │
│  └──────────────────────────────────────────┘                   │
└──────────────────────┬──────────────────────────────────────────┘
                       │ WebRTC (SRTP + SCTP)
                       │ Signaling: WebSocket
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      SERVER (NestJS)                              │
│                                                                   │
│  ┌────────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │ Media Server   │   │ Call Service │   │ Signaling        │   │
│  │ (mediasoup)    │   │              │   │ Gateway (WS)     │   │
│  │                │   │ - State mgmt │   │                  │   │
│  │ - Audio router │   │ - Billing    │   │ - SDP exchange   │   │
│  │ - Opus ⇄ PCM   │   │ - Timers     │   │ - ICE candidates │   │
│  └───┬────────────┘   └──────┬───────┘   │ - Call events    │   │
│      │                       │           └──────────────────┘   │
│      │    ┌──────────────────▼──────────────────────┐           │
│      │    │            PIPELINE ORCHESTRATOR         │           │
│      │    │                                          │           │
│      │    │  Audio ──▶ STT ──▶ LLM ──▶ TTS ──▶ Audio│           │
│      │    │  (PCM)    (text)  (text)   (PCM)   (PCM)│           │
│      │    │                                          │           │
│      │    │  ┌────────────┐  ┌──────────────────┐   │           │
│      │    │  │ Interrupt  │  │ Turn Manager     │   │           │
│      │    │  │ Detector   │  │ - User turn      │   │           │
│      │    │  │            │  │ - AI turn        │   │           │
│      │    │  │ VAD-based  │  │ - Barge-in       │   │           │
│      │    │  └────────────┘  └──────────────────┘   │           │
│      │    └─────────────────────────────────────────┘           │
│      │                                                           │
│  ┌───▼──────────────────────────────────────────────────────┐   │
│  │              Alibaba DashScope API                         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │   │
│  │  │ ASR      │  │ Chat     │  │ TTS (qwen3-tts-     │   │   │
│  │  │ (qwen3-  │  │ (qwen3.5 │  │ instruct-flash /     │   │   │
│  │  │ asr-     │  │ -flash)  │  │ flash-realtime)      │   │   │
│  │  │ flash)   │  │          │  │                      │   │   │
│  │  └──────────┘  └──────────┘  └──────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## MVP: Async Voice Messages

### Current Flow (Implemented)

```
1. User records audio on client (MediaRecorder API → Opus/WebM blob)
2. Client sends audio as base64 via POST /v1/ai/asr:
   {
     "audioBase64": "<base64-encoded audio>"
   }
3. Server calls alibabaASR() → returns { text, language }
4. Client receives transcription
5. Client sends transcribed text via POST /v1/ai/chat/stream (SSE)
6. Client receives AI text response (streaming)
7. Optionally: Client calls POST /v1/ai/tts to get audio of response
```

### AiService.transcribeVoice()

```typescript
// apps/api/src/ai/ai.service.ts

async transcribeVoice(userId: string, audioBase64: string) {
  // 1. Credit check
  const wallet = await db.select().from(creditWallets)
    .where(eq(creditWallets.userId, userId)).limit(1);
  const balance = wallet[0]?.balance ?? 0;
  const cost = Math.max(getCreditCost('qwen3-asr-flash', 'asr', { seconds: 30 }), 6);

  if (balance < cost) {
    throw new Error(`Insufficient credits: need ${cost}, have ${balance}`);
  }

  // 2. Call ASR
  const result = await alibabaASR({ audioBase64 });
  // Returns: { text: "transcribed speech", language: "en" }

  // 3. Record job + usage
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

  await db.insert(usageEvents).values({
    userId,
    generationJobId: job.id,
    providerId: 'alibaba',
    generationType: 'asr',
    audioSeconds: '30',
    providerCostUsd: '0.00105',
    creditsDebited: cost,
    pricingSnapshot: {
      model: 'qwen3-asr-flash',
      credits: cost,
      estimatedSeconds: 30,
    },
  });

  // 4. Debit wallet
  await db.update(creditWallets).set({
    balance: sql`GREATEST(0, ${creditWallets.balance} - ${cost})`,
    lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${cost}`,
    updatedAt: new Date(),
  }).where(eq(creditWallets.userId, userId));

  return { text: result.text, language: result.language, creditsUsed: cost };
}
```

### REST Endpoints

```
POST /v1/ai/asr          — ASR transcription (audio → text)
POST /v1/ai/tts          — TTS generation (text → audio)
POST /v1/ai/chat/stream  — Chat with streaming response (text → text, SSE)
```

---

## Target: Real-Time Voice Calls

### Call Lifecycle

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  IDLE    │────▶│ RINGING  │────▶│CONNECTED │────▶│  ENDED   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                      │
                          ┌───────────┴───────────┐
                          ▼                       ▼
                   ┌─────────────┐         ┌─────────────┐
                   │ USER_TALKING│◀───────▶│ AI_TALKING  │
                   └─────────────┘         └─────────────┘
```

### Signaling Protocol (WebSocket)

The signaling channel handles call setup/teardown and WebRTC SDP/ICE exchange. It extends the existing `ChatGateway`.

```typescript
// apps/api/src/voice/voice-signaling.gateway.ts

@WebSocketGateway({ namespace: '/ws' })
export class VoiceSignalingGateway {
  // ── Call initiation ──

  @SubscribeMessage('voice:call')
  async handleCall(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { characterId: string },
  ) {
    // 1. Validate character exists and is published
    const character = await this.charactersService.findById(data.characterId);
    if (!character || character.status !== 'published') {
      return { error: 'Character not available for calls' };
    }

    // 2. Check credit balance (voice calls consume credits continuously)
    const balance = await this.getBalance(client.userId!);
    if (balance < VOICE_CALL_MIN_CREDITS) {
      return { error: 'Insufficient credits for voice call' };
    }

    // 3. Create call record
    const [call] = await db.insert(voiceCalls).values({
      userId: client.userId!,
      characterId: data.characterId,
      status: 'ringing',
      startedAt: new Date(),
    }).returning();

    // 4. Notify client
    return {
      callId: call.id,
      status: 'ringing',
      iceServers: this.getIceServers(),
    };
  }

  // ── WebRTC signaling: SDP exchange ──

  @SubscribeMessage('voice:sdp')
  async handleSDP(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      callId: string;
      type: 'offer' | 'answer';
      sdp: string;
    },
  ) {
    // Validate call ownership
    const call = await this.validateCall(data.callId, client.userId!);

    if (data.type === 'offer') {
      // Client → Server: store client's SDP offer
      await db.update(voiceCalls).set({
        clientSdp: data.sdp,
      }).where(eq(voiceCalls.id, data.callId));

      // Server generates answer (via mediasoup or direct RTP)
      const answer = await this.generateSdpAnswer(data.callId, data.sdp);
      return { type: 'answer', sdp: answer.sdp };

    } else if (data.type === 'answer') {
      // Client acknowledges server's answer
      await db.update(voiceCalls).set({
        status: 'connected',
      }).where(eq(voiceCalls.id, data.callId));

      return { status: 'connected' };
    }
  }

  // ── ICE candidate exchange ──

  @SubscribeMessage('voice:ice')
  async handleICE(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      callId: string;
      candidate: RTCIceCandidateInit;
    },
  ) {
    // Relay ICE candidates (in full WebRTC with STUN/TURN)
    await this.addIceCandidate(data.callId, data.candidate);
    return { received: true };
  }

  // ── Hang up ──

  @SubscribeMessage('voice:hangup')
  async handleHangup(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string },
  ) {
    await this.endCall(data.callId, client.userId!, 'user_hangup');
    return { status: 'ended' };
  }

  // ── Helpers ──

  private getIceServers(): RTCIceServer[] {
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      // TURN servers for NAT traversal in production
    ];
  }
}
```

### Pipeline Orchestrator

The core of real-time voice calling: a bidirectional pipeline that processes audio frames through STT → LLM → TTS with interruption support.

```typescript
// apps/api/src/voice/pipeline-orchestrator.service.ts

interface AudioFrame {
  /** Raw PCM 16-bit mono 16kHz audio data */
  data: Buffer;
  /** Timestamp in milliseconds since call start */
  timestampMs: number;
}

interface PipelineState {
  callId: string;
  characterId: string;
  userId: string;
  /** Current conversation turn */
  turn: 'user' | 'ai';
  /** Buffered user audio (accumulated for STT) */
  audioBuffer: Buffer[];
  /** Current partial transcription */
  partialText: string;
  /** Current AI response (streaming) */
  aiResponseBuffer: string;
  /** Whether the AI is currently speaking */
  aiIsSpeaking: boolean;
  /** Timestamp of last user speech detected */
  lastUserSpeechMs: number;
  /** Conversation history for LLM context */
  transcriptHistory: TranscriptEntry[];
}

interface TranscriptEntry {
  role: 'user' | 'ai';
  text: string;
  timestampMs: number;
}

@Injectable()
export class PipelineOrchestratorService {
  private activePipelines = new Map<string, PipelineState>();

  /**
   * Start a pipeline for a new call.
   */
  startPipeline(callId: string, characterId: string, userId: string): void {
    const state: PipelineState = {
      callId,
      characterId,
      userId,
      turn: 'user',
      audioBuffer: [],
      partialText: '',
      aiResponseBuffer: '',
      aiIsSpeaking: false,
      lastUserSpeechMs: Date.now(),
      transcriptHistory: [],
    };
    this.activePipelines.set(callId, state);
  }

  /**
   * Process an incoming audio frame from the user.
   */
  async processAudioFrame(callId: string, frame: AudioFrame): Promise<PipelineAction[]> {
    const state = this.activePipelines.get(callId);
    if (!state) return [];

    const actions: PipelineAction[] = [];

    // 1. Voice Activity Detection (VAD)
    const hasSpeech = this.detectSpeech(frame.data);

    if (hasSpeech) {
      // User is speaking — buffer audio for STT
      state.audioBuffer.push(frame.data);
      state.lastUserSpeechMs = frame.timestampMs;

      // If AI was speaking, trigger barge-in (interruption)
      if (state.aiIsSpeaking) {
        actions.push({ type: 'interrupt_ai' });
        state.aiIsSpeaking = false;
        state.turn = 'user';
      }
    }

    // 2. Check for end of user's turn (silence threshold)
    const silenceDuration = frame.timestampMs - state.lastUserSpeechMs;
    const isEndOfTurn = hasSpeech === false && silenceDuration > SILENCE_THRESHOLD_MS
      && state.audioBuffer.length > 0;

    if (isEndOfTurn) {
      actions.push(...await this.processUserTurn(state));
    }

    return actions;
  }

  /**
   * Process end of user's speaking turn.
   */
  private async processUserTurn(state: PipelineState): Promise<PipelineAction[]> {
    const actions: PipelineAction[] = [];

    // STT: Convert accumulated audio buffer to text
    const audioData = Buffer.concat(state.audioBuffer);
    const audioBase64 = audioData.toString('base64');

    const sttResult = await alibabaASR({ audioBase64 });
    const userText = sttResult.text.trim();

    // Clear buffer
    state.audioBuffer = [];
    state.partialText = '';

    if (!userText) return actions;

    // Add to transcript
    state.transcriptHistory.push({
      role: 'user',
      text: userText,
      timestampMs: Date.now(),
    });

    actions.push({ type: 'user_transcript', text: userText });

    // LLM: Get character response (streaming)
    const chatMessages = [
      {
        role: 'system' as const,
        content: await this.buildCallContext(state.characterId, state.userId, state.transcriptHistory),
      },
      { role: 'user' as const, content: userText },
    ];

    let fullResponse = '';
    state.turn = 'ai';

    // Stream LLM response, feeding to TTS as chunks arrive
    for await (const chunk of alibabaChatStream({
      messages: chatMessages,
      temperature: 0.85,
      maxTokens: 100,    // Shorter for voice
    })) {
      fullResponse += chunk;
      actions.push({ type: 'ai_text_chunk', text: chunk });
    }

    state.transcriptHistory.push({
      role: 'ai',
      text: fullResponse,
      timestampMs: Date.now(),
    });

    // TTS: Generate speech from full response
    state.aiIsSpeaking = true;

    try {
      const ttsResult = await this.generateCallTTS(
        state.characterId,
        fullResponse,
      );
      actions.push({ type: 'ai_audio', audioBase64: ttsResult.audioBase64 });
    } catch (err) {
      actions.push({ type: 'error', message: 'TTS generation failed' });
    }

    state.aiIsSpeaking = false;
    state.turn = 'user';

    return actions;
  }

  /**
   * Build the LLM system prompt specifically for voice calls.
   * Voice calls need even shorter responses than text chat.
   */
  private async buildCallContext(
    characterId: string,
    userId: string,
    transcript: TranscriptEntry[],
  ): Promise<string> {
    const char = await this.loadCharacter(characterId);
    const rel = await this.loadRelationship(characterId, userId);

    // Voice-specific instructions
    return `YOU ARE ${char.name.toUpperCase()}.

This is a VOICE CALL — you are speaking out loud, not texting.

CRITICAL VOICE RULES:
- Responses must be SHORT — 1 sentence, max 15 words
- Speak naturally. Pauses and "um" are fine if it fits your character
- NEVER write paragraphs. You're talking, not reading an essay
- Respond like a real phone call, not customer support
- Match your speaking pace to the conversation energy
- If you don't understand something, say so conversationally
- One thought per response. Don't bundle multiple topics

YOUR PERSONALITY: ${char.personality || 'Natural and genuine'}
RELATIONSHIP: ${this.getRelationshipLabel(rel)}

RECENT CONVERSATION:
${transcript.slice(-6).map(t => `${t.role === 'user' ? 'THEM' : 'YOU'}: ${t.text}`).join('\n')}`;
  }

  /**
   * Generate TTS with the character's assigned voice profile.
   */
  private async generateCallTTS(
    characterId: string,
    text: string,
  ): Promise<{ audioBase64: string }> {
    const char = await this.loadCharacter(characterId);
    const voiceKey = (char as any).ttsVoice || 'aria';

    return alibabaTTS({
      text,
      voice: voiceKey,
      model: 'qwen3-tts-instruct-flash',
      emotion: this.detectEmotion(text),
    });
  }

  /**
   * Simple VAD: energy-based speech detection.
   */
  private detectSpeech(pcmData: Buffer): boolean {
    // RMS energy threshold
    const samples = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.length / 2);
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      sumSquares += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sumSquares / samples.length);
    return rms > VAD_THRESHOLD;
  }

  /**
   * Detect emotional tone from text for TTS emotion parameter.
   */
  private detectEmotion(text: string): TTSemotion {
    const lower = text.toLowerCase();
    if (lower.match(/!{2,}|awesome|amazing|wow|yay|love/)) return 'happy';
    if (lower.match(/:\(|sorry|sad|miss|cry|unfortunately/)) return 'sad';
    if (lower.match(/no!|stop|angry|frustrat|ugh/)) return 'angry';
    if (lower.match(/really\?|what\?|omg|wait/)) return 'surprised';
    return 'neutral';
  }
}

// Constants
const SILENCE_THRESHOLD_MS = 800;   // 800ms silence = end of turn
const VAD_THRESHOLD = 500;          // RMS energy threshold
const VOICE_CALL_MIN_CREDITS = 50;  // Minimum credits to start a call

type PipelineAction =
  | { type: 'user_transcript'; text: string }
  | { type: 'ai_text_chunk'; text: string }
  | { type: 'ai_audio'; audioBase64: string }
  | { type: 'interrupt_ai' }
  | { type: 'error'; message: string };
```

---

## Interruption (Barge-In) Handling

When the user starts speaking while the AI is talking, the system must:

1. **Stop TTS playback** — Cancel the current TTS generation or stop sending audio frames
2. **Stop LLM generation** — Abort the streaming LLM response
3. **Reset the turn** — Clear AI response buffer, switch turn to `user`
4. **Buffer incoming audio** — Start collecting user audio for the next STT cycle

```typescript
// Interruption flow pseudocode

function handleBargeIn(state: PipelineState): PipelineAction[] {
  // 1. Abort in-flight LLM stream
  state.abortController?.abort();         // Abort the fetch for chat completions

  // 2. Stop TTS generation/playback
  state.aiIsSpeaking = false;

  // 3. Discard partial AI response
  state.aiResponseBuffer = '';

  // 4. Switch turn
  state.turn = 'user';

  // 5. Reset audio buffer to capture new user speech
  state.audioBuffer = [];

  return [
    { type: 'interrupt_ai' },              // Client: stop audio playback
    { type: 'turn_change', turn: 'user' }, // Client: show user-speaking UI
  ];
}
```

### AbortController for LLM Streaming

```typescript
// The streaming fetch must be abortable
const abortController = new AbortController();
state.abortController = abortController;

try {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { ... },
    body: JSON.stringify({ stream: true, ... }),
    signal: abortController.signal,  // ← Abortable
  });
  // ... stream processing
} catch (err) {
  if (err.name === 'AbortError') {
    // Barge-in: clean abort, not an error
    return;
  }
  throw err;
}
```

---

## WebRTC Integration

### mediasoup-Based Architecture (Target)

For production-grade voice calls, the system will use [mediasoup](https://mediasoup.org/) — a WebRTC SFU (Selective Forwarding Unit) for Node.js.

```
Client (Browser)                    Server (NestJS + mediasoup)
     │                                     │
     │  ── WebSocket: createTransport ──▶  │
     │  ◀── routerRtpCapabilities ────    │
     │                                     │
     │  ── WebSocket: createProducer ──▶   │
     │     (audio track, Opus)             │
     │                                     │
     │  ◀── WebSocket: newConsumer ───    │
     │     (AI audio, Opus)                │
     │                                     │
     │  ── WebRTC ICE/DTLS ───────────▶   │
     │  ◀── SRTP audio streams ────────   │
```

### mediasoup Worker Setup

```typescript
// apps/api/src/voice/mediasoup.service.ts

import * as mediasoup from 'mediasoup';

@Injectable()
export class MediasoupService implements OnModuleInit {
  private worker: mediasoup.types.Worker;
  private router: mediasoup.types.Router;
  private transports = new Map<string, mediasoup.types.WebRtcTransport>();
  private producers = new Map<string, mediasoup.types.Producer>();
  private consumers = new Map<string, mediasoup.types.Consumer>();

  async onModuleInit() {
    // Create a single mediasoup worker
    this.worker = await mediasoup.createWorker({
      logLevel: 'warn',
      rtcMinPort: 40000,
      rtcMaxPort: 49999,
    });

    // Create a router for audio-only calls
    this.router = await this.worker.createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
      ],
    });
  }

  /**
   * Create a WebRTC transport for a client.
   */
  async createTransport(userId: string) {
    const transport = await this.router.createWebRtcTransport({
      listenIps: [{ ip: '0.0.0.0', announcedIp: process.env.PUBLIC_IP }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

    this.transports.set(userId, transport);

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  /**
   * Connect a transport with the client's DTLS parameters.
   */
  async connectTransport(userId: string, dtlsParameters: any) {
    const transport = this.transports.get(userId);
    if (!transport) throw new Error('Transport not found');
    await transport.connect({ dtlsParameters });
  }

  /**
   * Create a producer for the user's microphone audio.
   */
  async createProducer(userId: string, rtpParameters: any) {
    const transport = this.transports.get(userId);
    if (!transport) throw new Error('Transport not found');

    const producer = await transport.produce({
      kind: 'audio',
      rtpParameters,
    });

    this.producers.set(userId, producer);

    // Pipe audio to the pipeline orchestrator
    producer.on('transportclose', () => {
      producer.close();
      this.producers.delete(userId);
    });

    return { id: producer.id };
  }

  /**
   * Create a consumer for the AI's generated audio.
   */
  async createConsumer(userId: string, producerId: string, rtpCapabilities: any) {
    const transport = this.transports.get(userId);
    if (!transport) throw new Error('Transport not found');

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: false,
    });

    this.consumers.set(userId, consumer);

    return {
      id: consumer.id,
      producerId: consumer.producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    };
  }
}
```

### Alternative: Direct RTP (Simpler MVP)

For an MVP without mediasoup complexity, the server can send raw PCM audio over a WebSocket data channel and let the client handle playback:

```
Server → WebSocket → Client
  Each message: { type: 'audio', data: base64Pcm16, sampleRate: 16000 }
  Client uses Web Audio API to play the PCM buffer
```

This avoids WebRTC entirely for the first iteration, at the cost of higher latency and no adaptive bitrate.

---

## Voice Call Database Schema

```sql
-- Drizzle schema
export const voiceCalls = pgTable('voice_calls', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  characterId: uuid('character_id').notNull().references(() => characters.id),
  status: text('status').notNull().default('ringing'),
    // ringing | connected | ended

  -- WebRTC signaling
  clientSdp: text('client_sdp'),
  serverSdp: text('server_sdp'),

  -- Call stats
  durationSeconds: integer('duration_seconds'),
  userSpeechSeconds: integer('user_speech_seconds'),
  aiSpeechSeconds: integer('ai_speech_seconds'),
  interruptionCount: integer('interruption_count').default(0),

  -- Billing
  totalCreditsUsed: integer('total_credits_used').default(0),

  -- Timestamps
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  connectedAt: timestamp('connected_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

---

## Billing Model

Voice calls are billed per second of AI processing:

| Component        | Cost Basis              | Rate                |
|------------------|-------------------------|---------------------|
| STT (ASR)        | Per second of user audio| $0.000035/sec       |
| LLM (Chat)       | Per input+output tokens | qwen3.5-flash rates |
| TTS              | Per character generated | $0.13/10K chars     |
| Total per min    | Estimated               | ~3–5 credits/min    |

Credits are debited incrementally every 15 seconds during a call. If credit balance drops below the minimum threshold mid-call, the call is gracefully terminated with a "low credits" warning.

```typescript
// Credit ticking during calls
const CREDIT_TICK_INTERVAL_MS = 15_000;

setInterval(async () => {
  for (const [callId, state] of this.activePipelines) {
    const cost = this.estimateCallCost(state);
    const balance = await this.getBalance(state.userId);
    if (balance < cost + 5) {
      await this.endCall(callId, state.userId, 'insufficient_credits');
    } else {
      await this.debitCallCredits(state.userId, callId, cost);
    }
  }
}, CREDIT_TICK_INTERVAL_MS);
```

---

## Implementation Phases

### Phase 1 (Current): Async Voice Messages
- `POST /v1/ai/asr` — upload audio, get transcription
- `POST /v1/ai/tts` — send text, get audio playback
- No real-time interaction

### Phase 2: WebSocket Voice Pipeline
- Add Voice Signaling Gateway to existing ChatGateway
- Implement PipelineOrchestratorService
- Stream PCM audio over WebSocket data channel
- Basic VAD-based turn detection

### Phase 3: Real-Time TTS Streaming
- Use `qwen3-tts-flash-realtime` for streaming TTS
- Send audio chunks as they're generated
- Lower latency (no waiting for full response)

### Phase 4: WebRTC with mediasoup
- Full WebRTC integration
- Opus codec with adaptive bitrate
- TURN/STUN for NAT traversal
- Production-grade call quality

---

## Dependencies

```
VoiceSignalingGateway
  ├── CharactersService
  ├── PipelineOrchestratorService
  └── DB: voiceCalls

PipelineOrchestratorService
  ├── alibabaASR()          (packages/ai-core)
  ├── alibabaChatStream()   (packages/ai-core)
  ├── alibabaTTS()          (packages/ai-core)
  ├── ContextBuilderService (apps/api)
  └── MediasoupService      (apps/api, Phase 4)
```
