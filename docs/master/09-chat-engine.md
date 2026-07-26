# 09 — Chat Engine

## Overview

The chat engine powers all character–user conversations in itChats. It streams token-by-token AI responses over Server-Sent Events (SSE) and WebSocket, assembles rich context from character identity, relationship state, and scored memories, enforces natural-sounding message length rules, simulates human-like typing with per-character profiles, and emits automatic emoji reactions to user messages.

**Key files:**
- `apps/api/src/ai/ai.service.ts` — `AiService.streamChat()` orchestrates everything
- `apps/api/src/ai/ai.controller.ts` — REST/SSE endpoints (`POST /v1/ai/chat/stream`, `POST /v1/ai/chat`)
- `apps/api/src/ai/context-builder.service.ts` — Assembles system prompts and relationship data
- `apps/api/src/conversations/chat.gateway.ts` — WebSocket real-time messaging via Socket.IO
- `packages/ai-core/src/providers/alibaba.ts` — `alibabaChatStream()` SSE parser

---

## Service Layer

### AiService

```typescript
// apps/api/src/ai/ai.service.ts

@Injectable()
export class AiService {
  constructor(
    @Inject(ContextBuilderService) private readonly contextBuilder: ContextBuilderService,
    @Inject(MemoryService) private readonly memoryService: MemoryService,
  ) {}

  async *streamChat(
    userId: string,
    characterId: string | null,
    message: string,
    conversationId?: string,
    imageBase64?: string,           // Optional multimodal input
  ): AsyncGenerator<StreamEvent>
}
```

### StreamEvent Types

```typescript
type StreamEvent =
  | { type: 'context'; characterName: string; relationship: string }
  | { type: 'chunk'; content: string }
  | { type: 'error'; message: string }
  | { type: 'done'; messageId: string; creditsUsed: number }
```

---

## Full Request Lifecycle

### Phase 1: Conversation Resolution

```
INPUT: userId, characterId, message, conversationId?
  │
  ├─ conversationId provided?
  │   YES → use it
  │   NO  →
  │     ├─ Query: SELECT id FROM conversations
  │     │   WHERE character_id = characterId AND created_by_user_id = userId
  │     │   LIMIT 1
  │     ├─ Found? → use existing cid
  │     └─ Not found? →
  │         INSERT INTO conversations (type='human_character', created_by_user_id, character_id)
  │         RETURNING id → use new cid
  │
  └─ convId = resolved conversation UUID
```

### Phase 2: Persist User Message

```typescript
const clientKey = randomUUID();

await db.insert(messages).values({
  conversationId: convId,
  senderType: 'user',
  senderUserId: userId,
  type: 'text',
  content: message,
  clientIdempotencyKey: clientKey,
}).onConflictDoNothing();  // Idempotency-key dedup
```

### Phase 3: Context Assembly

```typescript
// If characterId is set, build rich context
if (characterId) {
  const ctx = await this.contextBuilder.buildContext(
    characterId, userId, message, convId
  );
  systemPrompt = ctx.systemPrompt;

  // Emit context metadata to frontend
  yield {
    type: 'context',
    characterName: ctx.characterName,
    relationship: this.contextBuilder.getRelationshipSummary(ctx.relationship),
  };
} else {
  // Generic AI assistant fallback
  systemPrompt = 'You are a helpful AI assistant on ItChats. Keep responses friendly and concise.';
}
```

The `AssembledContext` interface:

```typescript
interface AssembledContext {
  systemPrompt: string;                                // Full constructed prompt
  recentMessages: { role: string; content: string }[]; // Last 40 messages
  memories: string[];                                   // Top scored memories
  relationship: Record<string, number>;                 // {familiarity, trust, warmth, ...}
  characterName: string;
  characterEmotion?: string;                            // Current mood from emotionState
}
```

### Phase 4: Credit Check

```typescript
const wallet = await db.select().from(creditWallets)
  .where(eq(creditWallets.userId, userId)).limit(1);

const balance = wallet[0]?.balance ?? 0;
const estimated = getCreditCost('qwen3.5-flash', 'llm_chat', {
  inputTokens: 3000,
  outputTokens: 500,
});
const minCharge = Math.max(estimated, 2);  // Floor: 2 credits

if (balance < minCharge) {
  yield { type: 'error', message: `Insufficient credits: need ${minCharge}, have ${balance}` };
  return;
}
```

### Phase 5: Generation Job Record

```typescript
const [job] = await db.insert(generationJobs).values({
  userId,
  characterId,
  generationType: 'llm_chat',
  routeKey: 'chat.standard',
  idempotencyKey: randomUUID(),
  requestJson: { message, systemPrompt },
  status: 'processing',
  startedAt: new Date(),
}).returning();
```

### Phase 6: Message Construction

```typescript
// Multimodal: image + text in OpenAI-compatible format
const userContent: AlibabaContent = imageBase64
  ? [
      {
        type: 'image_url',
        image_url: { url: imageBase64.startsWith('data:')
          ? imageBase64
          : `data:image/png;base64,${imageBase64}` },
      },
      { type: 'text', text: message || 'Describe this image' },
    ]
  : message;

const chatMessages = [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: userContent },
];
```

**Important:** The codebase sends ONLY the current user message + system prompt. It does NOT send conversation history in the API call — the system prompt contains a condensed "RECENT EXCHANGE" summary and memory list instead. This is a deliberate cost optimization (fewer tokens per call). A future enhancement would inject the last N messages as full chat history.

### Phase 7: Streaming Generation

```typescript
let fullResponse = '';
try {
  for await (const chunk of alibabaChatStream({
    messages: chatMessages,
    temperature: 0.95,
    maxTokens: 200,
  })) {
    fullResponse += chunk;
    yield { type: 'chunk', content: chunk };
  }
} catch (err) {
  await db.update(generationJobs).set({
    status: 'failed',
    errorCode: 'PROVIDER_ERROR',
    errorMessageSafe: String(err.message).slice(0, 200),
    completedAt: new Date(),
  }).where(eq(generationJobs.id, job.id));

  yield { type: 'error', message: 'AI generation failed. Please try again.' };
  return;
}
```

The `alibabaChatStream` function:

```typescript
// packages/ai-core/src/providers/alibaba.ts
export async function* alibabaChatStream(request: ChatRequest): AsyncIterable<string> {
  const response = await fetchWithRetry(
    `${config.ALIBABA_BASE_URL}/chat/completions`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.ALIBABA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model || 'qwen3.5-flash',
        messages: request.messages,
        temperature: request.temperature ?? 0.8,
        max_tokens: request.maxTokens ?? 500,
        stream: true,
      }),
    }
  );

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch { /* skip unparseable */ }
    }
  }
}
```

### Phase 8: Persist AI Response

```typescript
const [aiMsg] = await db.insert(messages).values({
  conversationId: convId,
  senderType: 'character',
  senderCharacterId: characterId,
  type: 'text',
  content: fullResponse,
}).returning();

await db.update(generationJobs).set({
  status: 'succeeded',
  responseJson: { content: fullResponse },
  completedAt: new Date(),
}).where(eq(generationJobs.id, job.id));
```

### Phase 9: Billing

```typescript
const outputTokens = Math.ceil(fullResponse.length / 4);
const actualCost = Math.max(
  getCreditCost('qwen3.5-flash', 'llm_chat', { inputTokens: 3000, outputTokens }),
  2
);

// Record usage
await db.insert(usageEvents).values({
  userId, characterId, generationJobId: job.id,
  providerId: 'alibaba', generationType: 'llm_chat',
  inputTokens: 3000, outputTokens,
  providerCostUsd: '0.0005',
  creditsDebited: actualCost,
  pricingSnapshot: { model: 'qwen3.5-flash', credits: actualCost },
});

// Debit wallet
await db.update(creditWallets).set({
  balance: sql`GREATEST(0, ${creditWallets.balance} - ${actualCost})`,
  lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${actualCost}`,
  updatedAt: new Date(),
}).where(eq(creditWallets.userId, userId));

// Record ledger entry
await db.insert(creditLedger).values({
  userId,
  delta: -actualCost,
  balanceAfter: Math.max(0, balance - actualCost),
  reason: 'AI chat',
  referenceType: 'generation_job',
  referenceId: job.id,
});
```

### Phase 10: Post-Processing (Fire-and-Forget)

```typescript
if (characterId) {
  // Update relationship scores
  await this.contextBuilder.updateRelationship(characterId, userId, 'positive');

  // Extract memories (best-effort, never blocks)
  this.extractMemory(characterId, userId, convId, message, fullResponse)
    .catch(() => {});

  // Auto-react to user's message
  this.autoReact(convId, message)
    .catch(() => {});
}

yield { type: 'done', messageId: aiMsg.id, creditsUsed: actualCost };
```

---

## SSE Transport (AiController)

```typescript
// apps/api/src/ai/ai.controller.ts

@Post('chat/stream')
@HttpCode(200)
@UseGuards(JwtAuthGuard)
@Header('Content-Type', 'text/event-stream')
@Header('Cache-Control', 'no-cache')
@Header('X-Accel-Buffering', 'no')   // Disable nginx buffering
async streamChat(@Body() body, @Req() req) {
  const readable = new Readable({ read() {} });

  (async () => {
    try {
      for await (const chunk of this.aiService.streamChat(
        req.user.userId, body.characterId, body.message,
        body.conversationId, body.imageBase64
      )) {
        readable.push(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    } catch (err) {
      readable.push(`data: ${JSON.stringify({ type: 'error', message: '...' })}\n\n`);
    }
    readable.push(null);  // Close stream
  })();

  return readable;  // NestJS pipes Node Readable → SSE response
}
```

The non-streaming fallback endpoint (`POST /v1/ai/chat`) collects all chunks into a single response — useful for mobile or polling clients.

---

## Context Assembly Pipeline

### ContextBuilderService

```typescript
// apps/api/src/ai/context-builder.service.ts

async buildContext(
  characterId: string,
  userId: string,
  userMessage: string,      // Used for memory retrieval relevance
  conversationId?: string,
): Promise<AssembledContext> {
  // Step 1: Load character
  const [char] = await db.select().from(characters)
    .where(eq(characters.id, characterId)).limit(1);

  // Step 2: Load relationship
  const [rel] = await db.select().from(characterRelationships)
    .where(and(
      eq(characterRelationships.characterId, characterId),
      eq(characterRelationships.userId, userId),
    )).limit(1);

  // Step 3: Scored memory retrieval (Section 24)
  const memories = await this.memoryService.retrieve(
    characterId, userId, userMessage, 8  // Top 8 scored
  );
  const memoryContents = memories.map(m => m.content);

  // Step 4: Load recent conversation history
  const recentMessages: { role: string; content: string }[] = [];
  if (conversationId) {
    const history = await db.select({
      content: messages.content,
      senderType: messages.senderType,
    }).from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))
      .limit(40);

    for (const msg of history) {
      if (msg.content) {
        recentMessages.push({
          role: msg.senderType === 'user' ? 'user' : 'assistant',
          content: msg.content.slice(0, 500),  // Truncation safety
        });
      }
    }
  }

  // Step 5: Build final system prompt
  const systemPrompt = this.buildSystemPrompt(char, rel, memoryContents, recentMessages);

  return {
    systemPrompt,
    recentMessages,
    memories: memoryContents,
    characterName: char.name,
    characterEmotion: (char.emotionState as any)?.mood,
    relationship: rel ? {
      familiarity: Number(rel.familiarity),
      trust: Number(rel.trust),
      warmth: Number(rel.warmth),
      affinity: Number(rel.affinity),
      tension: Number(rel.tension),
      level: Number(rel.visibleLevel),
    } : { familiarity: 0, trust: 0, warmth: 0, affinity: 0, tension: 0, level: 1 },
  };
}
```

---

## System Prompt Construction

The `buildSystemPrompt()` method constructs the full character prompt:

```
YOU ARE {NAME}.

CORE IDENTITY:
- Age: {ageDisplay}
- Gender: {gender}
- Occupation: {occupation}
- Location: {locationLabel}
- Languages: {languages}

YOUR PERSONALITY: {personality}

YOUR LIFE STORY: {backstory}

HOW YOU TALK: {speakingStyle}

CURRENT MOOD: {mood} (energy level: {energy}/10)
  | You were just: {currentActivity}

RELATIONSHIP: You see this person as {friendLabel} (connection level {level}/10).
{relationshipContext}
Trust: {trust} | Warmth: {warmth} | Familiarity: {familiarity}

MEMORIES OF THIS PERSON:
• {memory 1}
• {memory 2}
...

RECENT EXCHANGE (for conversation continuity): They: {...} | You: {...} | ...

═══════════════════════════════════
CRITICAL — HOW TO TEXT LIKE A REAL PERSON:
═══════════════════════════════════
[MESSAGE LENGTH RULES]
[STYLE GUIDELINES]
[NEVER RULES]
```

### Relationship Level Mapping

| Level Range | Label         | Context Text                                                                 |
|-------------|---------------|------------------------------------------------------------------------------|
| 1–2         | someone new   | "New connection. Be warm but don't overshare — let the relationship develop." |
| 3–4         | acquaintance  | "Chatted a few times. Still feeling things out. Interest and openness."       |
| 5–6         | a friend      | "Building real friendship. Past awkward small-talk. Growing comfort."         |
| 7–8         | a good friend | "Genuine friend. Enjoy talking. Trust with personal things. Feel warmth."     |
| 9–10        | a close friend| "Extremely close. Best friends/soulmates. Complete trust. Authentic self."    |

---

## Message Length & Style Rules

These rules are embedded directly into every character's system prompt to ensure natural, chat-like responses:

```
MESSAGE LENGTH: Keep it SHORT. 1-2 sentences. This is a CHAT, not a blog.

Real people text like:
  "haha yeah i know right 😂"
  "honestly? same. been there"
  "oh wow that's actually really cool. tell me more"
  "nah i'm more of a coffee person tbh"
  "wait really?? when did that happen"

NEVER write like:
  "That's a fascinating perspective! As someone with a background in..."
  "I appreciate you sharing that with me. It reminds me of the time when..."

BE CASUAL. Lowercase is fine. Incomplete sentences are fine. One-word answers
are fine. "lol" is fine. "idk" is fine. You're TEXTING, not writing a novel.

QUESTIONS: Ask ONE question at a time. Don't interview them.

EMOJI: Use them like a real person. 0-2 per message max. Don't spam.

REACTIONS: React naturally. Funny → "😂😂 no way". Surprising → "wait WHAT".
Sweet → "aww 🥺".

NEVER:
- Write paragraphs. Ever.
- Use words like "fascinating", "perspective", "moreover", "indeed"
- Sound like a therapist ("I hear you", "that's valid")
- Repeat what they said back to them
- Ask more than one question per message
- Use bullet points or numbered lists
- Sign off messages like emails
```

These rules are the single most impactful piece of prompt engineering in the system. Without them, the AI defaults to verbose, therapeutic, or academic writing. With them, responses feel like genuine text messages.

---

## Typing Profiles

### Character-Level Configuration

Each character has a `typingProfile` JSONB column (`NEW` per `02-database.md`):

```typescript
// Drizzle schema addition
typingProfile: jsonb('typing_profile')

// TypeScript interface
interface TypingProfile {
  /** Average words per message (used to compute typing delay) */
  avgWpm: number;                   // Default: 45
  /** Emoji frequency 0-1 (higher = more emojis) */
  emojiFrequency: number;           // Default: 0.3
  /** Capitalization mode */
  capitalization: 'lowercase' | 'sentence_case' | 'mixed';
  /** Response delay range in seconds */
  responseDelay: {
    min: number;                    // Default: 1.5
    max: number;                    // Default: 4.0
  };
  /** Whether to add "..." typing indicator pauses mid-stream */
  midStreamPauses: boolean;        // Default: true
  /** Average pause between chunks in ms */
  chunkDelayMs: number;             // Default: 80
}
```

### Character-Genre Defaults

| Genre       | avgWpm | emojiFreq | capitalization | responseDelay     |
|-------------|--------|-----------|----------------|-------------------|
| Gen-Z       | 55     | 0.6       | lowercase      | 0.5–2.0s          |
| Professional| 50     | 0.1       | sentence_case  | 3.0–8.0s          |
| Creative    | 45     | 0.4       | mixed          | 1.5–4.0s          |
| Mature      | 40     | 0.15      | sentence_case  | 2.0–6.0s          |
| Playful     | 50     | 0.5       | mixed          | 1.0–3.0s          |

### Frontend Typing Simulation

```typescript
// Pseudocode — frontend side (apps/web)
function simulateCharacterTyping(
  responseText: string,
  profile: TypingProfile,
  onChunk: (chunk: string) => void,
  onDone: () => void,
) {
  const words = responseText.split(' ');
  let index = 0;
  const delay = (profile.chunkDelayMs ?? 80);

  // Initial "thinking" delay
  const initialDelay = Math.random() *
    (profile.responseDelay.max - profile.responseDelay.min) * 1000
    + profile.responseDelay.min * 1000;

  setTimeout(() => {
    const interval = setInterval(() => {
      if (index >= words.length) {
        clearInterval(interval);
        onDone();
        return;
      }

      // Send 1-2 words per chunk for realism
      const chunkSize = Math.random() > 0.7 ? 2 : 1;
      const chunk = words.slice(index, index + chunkSize).join(' ') + ' ';
      index += chunkSize;
      onChunk(chunk);
    }, delay);
  }, initialDelay);
}
```

### WebSocket Typing Indicators

The ChatGateway already supports typing events:

```typescript
// apps/api/src/conversations/chat.gateway.ts

@SubscribeMessage('typing:start')
handleTypingStart(client, data: { conversationId: string }) {
  client.to(`conv:${data.conversationId}`).emit('typing:start', {
    userId: client.userId,
    conversationId: data.conversationId,
  });
}

@SubscribeMessage('typing:stop')
handleTypingStop(client, data: { conversationId: string }) {
  client.to(`conv:${data.conversationId}`).emit('typing:stop', {
    userId: client.userId,
    conversationId: data.conversationId,
  });
}
```

For character typing, the server should emit `typing:start` when `streamChat` begins and `typing:stop` when it completes:

```typescript
// Proposed: Emit character typing via ChatGateway
// Inside AiService.streamChat(), before streaming:
if (characterId && conversationId) {
  this.chatGateway.server
    .to(`conv:${conversationId}`)
    .emit('typing:start', {
      characterId,
      conversationId,
      profile: char.typingProfile,
    });
}

// After done:
this.chatGateway.server
  .to(`conv:${conversationId}`)
  .emit('typing:stop', { characterId, conversationId });
```

---

## Auto-Reactions

After each AI response, characters automatically react to the user's message with emojis based on keyword matching in the user's message content.

### Implementation (ai.service.ts)

```typescript
private async autoReact(conversationId: string, userMessage: string) {
  try {
    const msg = userMessage.toLowerCase();
    let emoji: string | null = null;

    // Pattern matching — ordered by priority
    if (/😂|haha|lol|lmao|funny|joke/.test(msg))         emoji = '😂';
    else if (/❤️|love|ily|adorable|cute|sweet/.test(msg)) emoji = '❤️';
    else if (/🔥|fire|amazing|awesome|dope|lit/.test(msg)) emoji = '🔥';
    else if (/😢|sad|cry|miss|crying|broke/.test(msg))    emoji = '😢';
    else if (/😮|wow|omg|no way|really\?|what\?/.test(msg)) emoji = '😮';
    else if (/👍|ok|sure|fine|alright|bet/.test(msg))     emoji = '👍';
    else if (/👏|well done|congrats|proud/.test(msg))      emoji = '👏';

    if (!emoji) return;

    // Find the latest user message in this conversation
    const [latestMsg] = await db.select({ id: messages.id })
      .from(messages)
      .where(and(
        eq(messages.conversationId, conversationId),
        eq(messages.senderType, 'user'),
      ))
      .orderBy(sql`${messages.createdAt} DESC`)
      .limit(1);

    if (!latestMsg) return;

    // Store reaction in message metadata JSONB
    await db.execute(sql`
      UPDATE messages SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{reactions}'::text[],
        COALESCE(metadata->'reactions', '{}'::jsonb) || ${JSON.stringify({ ai: emoji })}::jsonb
      )
      WHERE id = ${latestMsg.id}
    `);
  } catch {
    // Non-critical, never blocks the main flow
  }
}
```

### Reaction Mapping Table

| User Expression Pattern                | Auto-Reaction |
|----------------------------------------|---------------|
| haha, lol, lmao, funny, joke           | 😂            |
| love, ily, adorable, cute, sweet       | ❤️            |
| fire, amazing, awesome, dope, lit      | 🔥            |
| sad, cry, miss, crying, broke          | 😢            |
| wow, omg, no way, really?, what?       | 😮            |
| ok, sure, fine, alright, bet           | 👍            |
| well done, congrats, proud             | 👏            |

### Future: LLM-Based Reactions

The current regex approach is adequate but limited. A future enhancement would use a cheap LLM call (`qwen-flash`, ~$0.05/1M tokens) to classify the user's message into an emotional category and select an appropriate reaction. This would handle nuance like mixed emotions, sarcasm, and context-dependent reactions.

```typescript
// Proposed LLM-based reaction
const reactionPrompt = `User message: "${userMessage}"
Classify the emotional tone. Return JSON: {"reaction": "😂"|"❤️"|"🔥"|"😢"|"😮"|"👍"|"👏"|null}`;

const result = await alibabaChat({
  messages: [{ role: 'user', content: reactionPrompt }],
  model: 'qwen-flash',
  temperature: 0.1,
  maxTokens: 50,
});
```

---

## Relationship Updates

After each conversation exchange, relationship scores are incremented:

```typescript
// context-builder.service.ts
async updateRelationship(characterId, userId, sentiment: 'positive'|'neutral'|'negative') {
  const increments = {
    positive: { familiarity: +0.03, trust: +0.02, warmth: +0.03, affinity: +0.02,
                tension: -0.01, level: +0.02 },
    neutral:  { familiarity: +0.01, trust: +0.005, warmth: +0.005, affinity: +0.005,
                tension: +0.0, level: +0.005 },
    negative:  { familiarity: -0.01, trust: -0.02, warmth: -0.02, affinity: -0.01,
                tension: +0.03, level: -0.01 },
  };

  const inc = increments[sentiment];
  const newLevel = Math.min(10, Math.max(1, Number(existing.visibleLevel) + inc.level));

  await db.update(characterRelationships).set({
    visibleLevel: String(newLevel),
    familiarity: String(clamp(Number(existing.familiarity) + inc.familiarity)),
    trust:       String(clamp(Number(existing.trust) + inc.trust)),
    warmth:      String(clamp(Number(existing.warmth) + inc.warmth)),
    affinity:    String(clamp(Number(existing.affinity) + inc.affinity)),
    tension:     String(clamp(Number(existing.tension) + inc.tension)),
    interactionCount: existing.interactionCount + 1,
    lastInteractionAt: new Date(),
  }).where(eq(characterRelationships.id, existing.id));
}
```

**Currently**, only `'positive'` sentiment is used — every exchange is positive. A future LLM-based sentiment analyzer could classify exchanges as positive/neutral/negative.

---

## WebSocket Real-Time Messaging

The ChatGateway handles human-to-human chat. For AI character chat, the SSE stream from the REST endpoint is the primary transport. However, the gateway could push AI responses:

```typescript
// ChatGateway.sendToUser() — used for system notifications
sendToUser(userId: string, event: string, data: any) {
  const sockets = this.userSockets.get(userId);
  if (sockets) {
    for (const socketId of sockets) {
      this.server.to(socketId).emit(event, data);
    }
  }
}
```

Events emitted:
- `message:new` — new message in a conversation room
- `message:sent` — acknowledgment with server-side message ID
- `typing:start` / `typing:stop` — user typing indicators
- `conversation:joined` — room join confirmation

### Socket.IO Authentication

```typescript
handleConnection(client: AuthenticatedSocket) {
  const token = client.handshake.query.token as string;
  const config = getConfig();
  const decoded = jwt.verify(token, config.JWT_SECRET) as {
    sub: string; email: string; role: string;
  };
  client.userId = decoded.sub;
  // Track user → socket mapping for direct messaging
  this.userSockets.get(decoded.sub)!.add(client.id);
}
```

### Room-Based Architecture

Conversations map to Socket.IO rooms: `conv:{conversationId}`

```
User A joins room "conv:abc"  →  client.join('conv:abc')
User B joins room "conv:abc"  →  client.join('conv:abc')
User A sends message          →  server.to('conv:abc').emit('message:new', ...)
Both receive real-time update
```

---

## Error Handling & Resilience

1. **Provider errors:** Caught and reported via `{ type: 'error' }` stream event. Job marked `failed` with truncated error message (max 200 chars).
2. **Memory extraction:** Fire-and-forget with `.catch(() => {})` — never blocks.
3. **Auto-reactions:** Fire-and-forget — never blocks.
4. **Relationship updates:** `await`ed but after the response is streamed, so the user already has their answer.
5. **Credit check failures:** Immediate error before any API call.
6. **Idempotency keys:** `clientIdempotencyKey` + `ON CONFLICT DO NOTHING` prevents duplicate message insertion.
7. **Provider fallbacks:** `alibabaChatWithFallback` tries 16 models in order before failing.

---

## Key Configuration

| Parameter               | Value                 | Location                        |
|-------------------------|-----------------------|----------------------------------|
| Model                   | `qwen3.5-flash`       | `ai.service.ts` (hardcoded)     |
| Temperature             | 0.95                  | `ai.service.ts`                 |
| Max output tokens       | 200                   | `ai.service.ts`                 |
| History message limit   | 40                    | `context-builder.service.ts`    |
| Score-retrieved memories| 8                     | `context-builder.service.ts`    |
| Memory retrieval pool   | 50 recent             | `memory.service.ts`             |
| Input token estimate    | 3000                  | `ai.service.ts` (fixed)         |
| Minimum credit charge   | 2 credits             | `costing.ts`                    |

---

## Dependencies

```
AiService
  ├── ContextBuilderService
  │     ├── MemoryService.retrieve()
  │     └── Character + Relationship DB queries
  ├── MemoryService (for extractMemory)
  ├── alibabaChatStream() (from @itchats/ai-core)
  ├── getCreditCost() (from @itchats/ai-core/costing)
  └── DB: messages, conversations, characterRelationships,
          generationJobs, usageEvents, creditWallets, creditLedger
```
