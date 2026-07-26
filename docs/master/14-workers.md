# 14 — Background Workers

## Overview

Background workers handle long-running, non-blocking, and scheduled tasks in itChats. They run in the `apps/worker` NestJS application process and execute jobs for character identity generation, story creation, relationship updates, memory extraction, autonomous life simulation, image quality ranking, identity validation, and periodic cleanup.

**Current state:** Workers are minimal — `StorySchedulerService` in `apps/api` uses `setInterval` for story generation. The `apps/worker` service is a stub with TODO comments. All other "background" work (memory extraction, auto-reactions, relationship updates) runs inline as fire-and-forget promises within the main API process.

**Target state:** Dedicated `apps/worker` with BullMQ queues, job handlers, retry logic, and monitoring.

**Key files:**
- `apps/worker/src/worker.service.ts` — Worker bootstrap (stub)
- `apps/api/src/stories/story-scheduler.service.ts` — Current in-process story scheduler
- `apps/api/src/ai/ai.service.ts` — Inline memory extraction + auto-reactions
- `apps/api/src/characters/character-creation.service.ts` — Character image generation

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      apps/worker (BullMQ)                         │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Queue Definitions                          │ │
│  │                                                               │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │ │
│  │  │ Character Queue │  │ Social Queue    │  │ Media Queue  │ │ │
│  │  │                 │  │                 │  │              │ │ │
│  │  │ - generate-ref  │  │ - story         │  │ - image-rank │ │ │
│  │  │ - identity-val  │  │ - relationship  │  │ - thumbnail  │ │ │
│  │  └────────┬────────┘  │ - memory        │  │ - transcode  │ │ │
│  │           │           │ - autonomous    │  └──────┬───────┘ │ │
│  │           │           └────────┬────────┘         │         │ │
│  │  ┌────────▼────────────────────▼──────────────────▼───────┐ │ │
│  │  │                 Maintenance Queue                       │ │ │
│  │  │  - cleanup (expired stories, old tokens, temp files)    │ │ │
│  │  │  - usage-reconciliation (daily)                        │ │ │
│  │  └────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Job Handlers                               │ │
│  │                                                               │ │
│  │  Worker 1: CharacterIdentityWorker                            │ │
│  │    handleGenerateReferencePack()                              │ │
│  │    handleIdentityValidation()                                 │ │
│  │                                                               │ │
│  │  Worker 2: SocialSimulationWorker                             │ │
│  │    handleStoryGeneration()                                    │ │
│  │    handleRelationshipUpdate()                                 │ │
│  │    handleMemoryExtraction()                                   │ │
│  │    handleAutonomousLife()                                     │ │
│  │                                                               │ │
│  │  Worker 3: MediaProcessingWorker                              │ │
│  │    handleImageRanking()                                       │ │
│  │    handleThumbnailGeneration()                                │ │
│  │    handleTranscoding()                                        │ │
│  │                                                               │ │
│  │  Worker 4: MaintenanceWorker                                  │ │
│  │    handleCleanup()                                            │ │
│  │    handleUsageReconciliation()                                │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 1. generate-reference-pack Worker

### Purpose
Generate 12–16 identity reference images for a character during creation. Each image represents a different pose/context (portrait, selfie, casual, outdoor, etc.). Images are validated for identity consistency against a canonical seed.

### Trigger
- Character creation flow: after autofill, before publishing
- Identity regeneration flow

### Job Definition

```typescript
// apps/worker/src/queue/character.queue.ts

import { Queue } from 'bullmq';

export const characterQueue = new Queue('character', {
  connection: { host: 'localhost', port: 6379 },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export interface GenerateReferencePackJob {
  jobType: 'generate-reference-pack';
  characterId: string;
  characterVersionId: string;
  ownerUserId: string;
  /** Reference types to generate (12-16 items) */
  referenceTypes: ReferenceType[];
  /** The canonical seed for identity consistency */
  canonicalSeed: number;
}

type ReferenceType =
  | 'portrait'
  | 'portrait_smile'
  | 'portrait_side'
  | 'portrait_full'
  | 'selfie'
  | 'casual'
  | 'indoor'
  | 'outdoor'
  | 'sitting'
  | 'walking'
  | 'night'
  | 'formal';
```

### Job Handler

```typescript
// apps/worker/src/handlers/character-identity.handler.ts

import { Worker, Job } from 'bullmq';
import { getDb } from '@itchats/database';
import {
  characters, characterReferencePacks, characterReferenceAssets,
  generationJobs, usageEvents, creditWallets,
} from '@itchats/database/schema';
import { alibabaTextToImageWithFallback } from '@itchats/ai-core';
import { buildReferenceImagePrompt } from '@itchats/ai-core/prompts';
import { getCreditCost } from '@itchats/ai-core/costing';
import { eq, sql } from 'drizzle-orm';

const worker = new Worker('character', async (job: Job<GenerateReferencePackJob>) => {
  const { characterId, characterVersionId, ownerUserId, referenceTypes, canonicalSeed } = job.data;

  // Progress tracking
  const totalImages = referenceTypes.length;
  let completed = 0;

  await job.updateProgress(0);

  // 1. Load character
  const db = getDb();
  const [char] = await db.select().from(characters)
    .where(eq(characters.id, characterId)).limit(1);
  if (!char) throw new Error('Character not found');

  // 2. Create reference pack record
  const [pack] = await db.insert(characterReferencePacks).values({
    characterId,
    characterVersionId,
    status: 'generating',
    canonicalSeed,
    provider: 'alibaba',
    model: 'qwen-image-2.0-pro',
  }).returning();

  // 3. Generate images sequentially (rate limit: 1 image at a time)
  const results: GeneratedImage[] = [];

  for (let i = 0; i < referenceTypes.length; i++) {
    const refType = referenceTypes[i];

    // Credit check per image
    const [wallet] = await db.select().from(creditWallets)
      .where(eq(creditWallets.userId, ownerUserId)).limit(1);
    const balance = wallet?.balance ?? 0;
    const cost = getCreditCost('qwen-image-2.0-pro', 'text_to_image');

    if (balance < cost) {
      // Mark pack as failed, remaining images not generated
      await db.update(characterReferencePacks)
        .set({ status: 'rejected' })
        .where(eq(characterReferencePacks.id, pack.id));
      throw new Error(`Insufficient credits for reference pack (image ${i + 1}/${totalImages})`);
    }

    try {
      // Build image prompt
      const prompt = buildReferenceImagePrompt(
        {
          name: char.name,
          ageDisplay: char.ageDisplay,
          gender: char.gender,
          description: char.description || '',
          personality: char.personality || '',
          occupation: char.occupation || '',
          photographyStyle: char.photographyStyle || '',
          cameraStyle: char.cameraStyle || '',
          interests: [],
          dislikes: [],
          languages: ['en'],
          defaultLanguage: 'en',
          // ... other fields
        } as any,
        refType,
        canonicalSeed + i,  // Each image gets a unique seed variant
      );

      // Generate
      const result = await alibabaTextToImageWithFallback({
        prompt,
        size: '1024*1024',
      });

      // Store reference asset
      const [asset] = await db.insert(characterReferenceAssets).values({
        characterId,
        characterVersionId,
        referenceType: refType,
        sortOrder: String(i),
        prompt,
        seed: canonicalSeed + i,
        generationJobId: null,  // TODO: record job
        approved: false,
        qualityScore: '0.0',
        identityScore: '0.0',
      }).returning();

      // Debit wallet
      await db.update(creditWallets).set({
        balance: sql`GREATEST(0, ${creditWallets.balance} - ${cost})`,
        lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${cost}`,
        updatedAt: new Date(),
      }).where(eq(creditWallets.userId, ownerUserId));

      results.push({
        referenceType: refType,
        url: result.url,
        assetId: asset.id,
        seed: canonicalSeed + i,
      });

      completed++;
      await job.updateProgress(Math.round((completed / totalImages) * 100));

    } catch (err: any) {
      // Individual image failure: log and continue
      await job.log(`Image ${i + 1} (${refType}) failed: ${err.message}`);
      // Don't throw — try remaining images
    }
  }

  // 4. Finalize pack
  const successCount = results.length;
  const packStatus = successCount >= 8 ? 'ready' : 'rejected';

  await db.update(characterReferencePacks).set({
    status: packStatus,
    generatedAt: new Date(),
    identityScore: '0.0',  // Will be updated by identity-validation worker
  }).where(eq(characterReferencePacks.id, pack.id));

  // 5. Update character status
  if (packStatus === 'ready') {
    await db.update(characters).set({
      status: 'ready',
      referencePackId: pack.id,
      updatedAt: new Date(),
    }).where(eq(characters.id, characterId));
  } else {
    await db.update(characters).set({
      status: 'draft',
      updatedAt: new Date(),
    }).where(eq(characters.id, characterId));
  }

  return { packId: pack.id, status: packStatus, imagesGenerated: successCount, totalImages };
}, {
  connection: { host: 'localhost', port: 6379 },
  concurrency: 1,  // One reference pack at a time (rate limiting)
});

interface GeneratedImage {
  referenceType: string;
  url: string;
  assetId: string;
  seed: number;
}
```

---

## 2. story Worker

### Purpose
Generate autonomous social media stories for characters with enabled autonomy.

### Trigger
- Scheduled: every 15 minutes via `repeat` job
- Manual: admin triggers

### Current Implementation (In-Process)

```typescript
// apps/api/src/stories/story-scheduler.service.ts

@Injectable()
export class StorySchedulerService {
  private interval: NodeJS.Timeout | null = null;

  start() {
    this.interval = setInterval(() => this.tick(), 15 * 60 * 1000);
    this.tick();  // Run on start
  }

  private async tick() {
    // 1. Query eligible characters (public, published, approved, autonomy enabled)
    // 2. For each: check credit balance
    // 3. Skip if last story < 48 hours ago
    // 4. Generate story text via LLM
    // 5. 30% chance: generate image via TTI
    // 6. Insert story row
    // 7. Debit wallet
  }
}
```

### Target: BullMQ-Repeatable Job

```typescript
// apps/worker/src/handlers/story.handler.ts

import { Queue, Worker } from 'bullmq';

// Schedule: every 15 minutes
export const storyQueue = new Queue('story', {
  connection: { host: 'localhost', port: 6379 },
});

// Add repeatable job on startup
await storyQueue.add(
  'autonomous-story-generation',
  {},
  {
    repeat: { pattern: '*/15 * * * *' },  // Every 15 minutes
    jobId: 'autonomous-story-generation',  // Dedup key
  },
);

const storyWorker = new Worker('story', async (job) => {
  const db = getDb();

  // 1. Get eligible characters
  const eligibleCharacters = await db.select({
    id: characters.id,
    name: characters.name,
    personality: characters.personality,
    backstory: characters.backstory,
    description: characters.description,
    ownerUserId: characters.ownerUserId,
    autonomyConfig: characters.autonomyConfig,
    contentStyle: characters.contentStyle,
    selfieStyle: characters.selfieStyle,
  }).from(characters)
    .where(and(
      eq(characters.visibility, 'public'),
      eq(characters.status, 'published'),
      eq(characters.moderationStatus, 'approved'),
      sql`${characters.autonomyConfig}->>'level' IS NOT NULL`,
      sql`(${characters.autonomyConfig}->>'level')::text NOT IN ('off')`,
    ))
    .limit(10);

  // 2. Process each character
  for (const char of eligibleCharacters) {
    await processCharacterStory(char);
  }
}, {
  connection: { host: 'localhost', port: 6379 },
  concurrency: 2,
});

async function processCharacterStory(char: EligibleCharacter): Promise<void> {
  const db = getDb();

  // Credit check
  const [wallet] = await db.select().from(creditWallets)
    .where(eq(creditWallets.userId, char.ownerUserId)).limit(1);
  const balance = wallet?.balance ?? 0;
  const storyCost = getCreditCost('qwen3.5-flash', 'llm_chat', {
    inputTokens: 500,
    outputTokens: 400,
  });

  if (balance < storyCost + 5) return;

  // Check last story time
  const [lastStory] = await db.select().from(stories)
    .where(and(
      eq(stories.authorCharacterId, char.id),
      eq(stories.generated, 'true' as any),
    ))
    .orderBy(sql`${stories.publishedAt} DESC NULLS LAST`)
    .limit(1);

  if (lastStory?.publishedAt) {
    const hoursSince = (Date.now() - new Date(lastStory.publishedAt).getTime()) / 3600000;
    const cadenceHours = getCadenceHours(char.autonomyConfig as any);
    if (hoursSince < cadenceHours) return;
  }

  // Generate story text
  const storyPrompt = buildStoryPrompt({
    character: {
      name: char.name,
      personality: char.personality || '',
      backstory: char.backstory || '',
    } as any,
    timeOfDay: getTimeOfDay(),
  });

  const storyResult = await alibabaChat({
    messages: [{ role: 'user', content: storyPrompt }],
    model: 'qwen3.5-flash',
    temperature: 1.0,
    maxTokens: 200,
  });

  const caption = storyResult.content.trim().substring(0, 300);

  // Maybe generate image (30% chance)
  let mediaUrl = '';
  let mediaType = '';
  let storyType = 'text';

  if (Math.random() < 0.3) {
    try {
      const imagePrompt = buildImagePrompt({
        character: { ...char, appearance: char.description } as any,
        imageType: 'selfie',
        context: caption,
      });

      const imgResult = await alibabaTextToImageWithFallback({
        prompt: imagePrompt,
        size: '1024*1024',
      });

      mediaUrl = imgResult.url;
      mediaType = 'image/png';
      storyType = 'image';

      // Debit image cost
      await this.billingService.debitWallet(
        char.ownerUserId,
        getCreditCost('qwen-image-2.0-pro', 'text_to_image'),
        'auto-story-image',
        'story',
        char.id,
      );
    } catch { /* Continue without image */ }
  }

  // Persist story
  const [story] = await db.insert(stories).values({
    authorCharacterId: char.id,
    characterId: char.id,
    status: 'published',
    storyType,
    caption,
    mediaUrl,
    mediaType,
    generated: 'true' as any,
    publishedAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 3600000),
  } as any).returning();

  // Debit text cost
  await this.billingService.debitWallet(
    char.ownerUserId,
    storyCost,
    'auto-story',
    'story',
    story!.id,
  );
}

function getCadenceHours(config: { cadence?: string }): number {
  switch (config.cadence) {
    case 'high': return 12;
    case 'medium': return 24;
    case 'low': return 48;
    default: return 48;
  }
}

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}
```

---

## 3. relationship Worker

### Purpose
Periodically update character relationships based on interaction quality, not just counters. Evaluate conversation quality, adjust multidimensional metrics.

### Trigger
- Scheduled: every 6 hours
- Event-driven: after significant interactions

```typescript
// apps/worker/src/handlers/relationship.handler.ts

export interface RelationshipUpdateJob {
  jobType: 'relationship-update';
  characterId: string;
  userId: string;
  /** Whether this was triggered by a specific interaction */
  trigger?: 'message_sent' | 'story_viewed' | 'voice_call' | 'periodic';
}

const relationshipWorker = new Worker('social', async (job: Job<RelationshipUpdateJob>) => {
  const { characterId, userId, trigger } = job.data;
  const db = getDb();

  const [rel] = await db.select().from(characterRelationships)
    .where(and(
      eq(characterRelationships.characterId, characterId),
      eq(characterRelationships.userId, userId),
    ))
    .limit(1);

  if (!rel) return;

  // Get recent interaction metrics
  const recentInteractions = await getRecentInteractions(characterId, userId);

  // Calculate quality scores
  const quality = evaluateInteractionQuality(recentInteractions);

  // Apply decay for inactivity
  const daysSinceLastInteraction = rel.lastInteractionAt
    ? (Date.now() - new Date(rel.lastInteractionAt).getTime()) / 86400000
    : 0;

  const decayFactor = Math.max(0, 1 - daysSinceLastInteraction * 0.01); // 1%/day decay

  // Update all relationship dimensions
  await db.update(characterRelationships).set({
    familiarity: String(clamp(Number(rel.familiarity) * decayFactor + quality.familiarityDelta)),
    trust: String(clamp(Number(rel.trust) * decayFactor + quality.trustDelta)),
    warmth: String(clamp(Number(rel.warmth) * decayFactor + quality.warmthDelta)),
    affinity: String(clamp(Number(rel.affinity) * decayFactor + quality.affinityDelta)),
    comfort: String(clamp(Number(rel.comfort || '0') * decayFactor + quality.comfortDelta)),
    attachment: String(clamp(Number(rel.attachment || '0') * decayFactor + quality.attachmentDelta)),
    chemistry: String(clamp(Number(rel.chemistry || '0') * decayFactor + quality.chemistryDelta)),
    conversationCount: rel.conversationCount + quality.newConversations,
    updatedAt: new Date(),
  }).where(eq(characterRelationships.id, rel.id));
}, {
  connection: { host: 'localhost', port: 6379 },
});

function evaluateInteractionQuality(interactions: RecentInteraction[]): QualityMetrics {
  // TODO: Use LLM-based quality scoring
  // For now: heuristic based on message count, length, and variety
  return {
    familiarityDelta: Math.min(0.05, interactions.length * 0.005),
    trustDelta: Math.min(0.03, interactions.filter(i => i.sentiment === 'positive').length * 0.003),
    warmthDelta: Math.min(0.04, interactions.length * 0.004),
    affinityDelta: Math.min(0.03, interactions.length * 0.003),
    comfortDelta: Math.min(0.02, interactions.length * 0.002),
    attachmentDelta: Math.min(0.01, interactions.filter(i => i.depth > 0.5).length * 0.002),
    chemistryDelta: Math.min(0.02, interactions.filter(i => i.humor > 0.5).length * 0.002),
    newConversations: interactions.filter(i => i.isNewConversation).length,
  };
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}
```

---

## 4. memory Worker

### Purpose
Offload memory extraction from the main API process to prevent blocking chat responses.

### Trigger
- Event-driven: after each AI response (enqueued by `AiService`)

```typescript
// apps/worker/src/handlers/memory.handler.ts

export interface MemoryExtractionJob {
  jobType: 'memory-extraction';
  characterId: string;
  userId: string;
  conversationId: string;
  userMessage: string;
  aiResponse: string;
}

const memoryWorker = new Worker('social', async (job: Job<MemoryExtractionJob>) => {
  const { characterId, userId, conversationId, userMessage, aiResponse } = job.data;

  // Skip trivial exchanges
  const combined = userMessage + aiResponse;
  if (combined.length < 30) return;

  // Build extraction prompt
  const extractionPrompt = buildMemoryExtractionPrompt(userMessage, aiResponse);

  // Use cheap model for extraction
  const result = await alibabaChat({
    messages: [{ role: 'user', content: extractionPrompt }],
    model: 'qwen-flash',       // $0.05/1M input tokens — cheapest
    temperature: 0.2,
    maxTokens: 200,
  });

  // Parse structured output
  const json = parseStructuredJson(result.content, MemoryExtractionSchema);
  if (!json?.hasMemory || !json.content || json.content.length < 3) return;

  // Store via MemoryService
  const memoryService = new MemoryService();  // Or inject
  await memoryService.store({
    characterId,
    userId,
    conversationId,
    content: json.content.slice(0, 300),
    memoryType: json.type || 'temporary_context',
    importance: clamp(Number(json.importance) || 0.4),
    confidence: clamp(Number(json.confidence) || 0.5),
    sourceMessageIds: [],
  });
}, {
  connection: { host: 'localhost', port: 6379 },
  concurrency: 4,
  limiter: {
    max: 20,        // Max 20 jobs
    duration: 60000, // Per minute
  },
});
```

### Enqueue from AiService

```typescript
// apps/api/src/ai/ai.service.ts — modification

// Replace inline extractMemory() with queue enqueue:
if (characterId) {
  // Enqueue memory extraction instead of inline processing
  await socialQueue.add('memory-extraction', {
    jobType: 'memory-extraction',
    characterId,
    userId,
    conversationId: convId,
    userMessage: message,
    aiResponse: fullResponse,
  }, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: 50,
  });
}
```

---

## 5. autonomous-life Worker

### Purpose
Simulate characters' daily lives: update emotion states, locations, activities based on their configured routines and schedules.

### Trigger
- Scheduled: every 15–30 minutes

```typescript
// apps/worker/src/handlers/autonomous-life.handler.ts

export interface AutonomousLifeJob {
  jobType: 'autonomous-life';
}

const autonomousLifeWorker = new Worker('social', async (job: Job<AutonomousLifeJob>) => {
  const db = getDb();
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat

  // Get all published characters with autonomy enabled
  const chars = await db.select().from(characters)
    .where(and(
      eq(characters.status, 'published'),
      eq(characters.moderationStatus, 'approved'),
      sql`${characters.autonomyConfig}->>'level' IS NOT NULL`,
      sql`(${characters.autonomyConfig}->>'level')::text != 'off'`,
    ));

  for (const char of chars) {
    const routines = (char as any).routines as DailyRoutine[] || [];
    const sleepSchedule = (char as any).sleepSchedule; // "23:00-07:00"

    // Check if character is sleeping
    if (isSleeping(sleepSchedule, hour)) {
      await updateEmotionState(char.id, { mood: 'asleep', energy: 0, currentActivity: 'sleeping' });
      continue;
    }

    // Find current routine
    const currentRoutine = findCurrentRoutine(routines, hour, dayOfWeek);
    if (!currentRoutine) continue;

    // Update emotion state based on routine
    const newState: EmotionState = {
      mood: currentRoutine.mood || 'neutral',
      energy: currentRoutine.energy || 5,
      currentActivity: currentRoutine.activity,
    };

    await updateEmotionState(char.id, newState);

    // Maybe trigger a story if the activity is notable
    if (shouldTriggerStory(currentRoutine)) {
      await storyQueue.add('autonomous-story', {
        characterId: char.id,
        trigger: 'routine',
        activity: currentRoutine.activity,
      });
    }
  }
}, {
  connection: { host: 'localhost', port: 6379 },
  limiter: { max: 1, duration: 900000 }, // Once per 15 minutes
});

interface DailyRoutine {
  dayOfWeek?: number;    // 0–6, undefined = every day
  startHour: number;     // 0–23
  endHour: number;
  activity: string;      // "work", "gym", "cafe", "social", "relax", etc.
  mood?: string;
  energy?: number;       // 0–10
}

function isSleeping(sleepSchedule: string | undefined, currentHour: number): boolean {
  if (!sleepSchedule) return false;
  const [start, end] = sleepSchedule.split('-').map(t => {
    const [h, m] = t.split(':').map(Number);
    return h + (m || 0) / 60;
  });
  if (start <= end) return currentHour >= start && currentHour < end;
  // Overnight schedule e.g. "23:00-07:00"
  return currentHour >= start || currentHour < end;
}

function findCurrentRoutine(
  routines: DailyRoutine[],
  hour: number,
  dayOfWeek: number,
): DailyRoutine | null {
  return routines.find(r =>
    (r.dayOfWeek === undefined || r.dayOfWeek === dayOfWeek) &&
    hour >= r.startHour && hour < r.endHour
  ) || null;
}

async function updateEmotionState(characterId: string, state: EmotionState): Promise<void> {
  const db = getDb();
  await db.update(characters).set({
    emotionState: {
      mood: state.mood,
      energy: state.energy,
      currentActivity: state.currentActivity,
    },
    updatedAt: new Date(),
  }).where(eq(characters.id, characterId));
}
```

---

## 6. image-ranking Worker

### Purpose
Evaluate generated reference images for quality and identity consistency. Rank images within a reference pack.

### Trigger
- After `generate-reference-pack` completes
- Event-driven

```typescript
// apps/worker/src/handlers/image-ranking.handler.ts

export interface ImageRankingJob {
  jobType: 'image-ranking';
  characterId: string;
  referencePackId: string;
}

const imageRankingWorker = new Worker('media', async (job: Job<ImageRankingJob>) => {
  const { characterId, referencePackId } = job.data;
  const db = getDb();

  // 1. Get all reference assets for this pack
  const assets = await db.select().from(characterReferenceAssets)
    .where(eq(characterReferenceAssets.characterId, characterId))
    .orderBy(sql`${characterReferenceAssets.sortOrder} ASC`);

  if (assets.length === 0) return;

  // 2. For each image, evaluate quality
  // TODO: Use an image quality model or LLM vision to score
  // For now: pseudo-random heuristic + manual review flag

  let totalIdentityScore = 0;
  let scoredCount = 0;

  for (const asset of assets) {
    // Placeholder: use LLM vision to compare against canonical description
    const qualityScore = await evaluateImageQuality(asset, characterId);
    const identityScore = await evaluateIdentityMatch(asset, characterId);

    await db.update(characterReferenceAssets).set({
      qualityScore: String(qualityScore),
      identityScore: String(identityScore),
      approved: qualityScore > 0.6 && identityScore > 0.7,
    }).where(eq(characterReferenceAssets.id, asset.id));

    totalIdentityScore += identityScore;
    scoredCount++;
  }

  // 3. Update pack-level identity score
  const avgIdentityScore = scoredCount > 0
    ? totalIdentityScore / scoredCount
    : 0;

  await db.update(characterReferencePacks).set({
    identityScore: String(avgIdentityScore),
  }).where(eq(characterReferencePacks.id, referencePackId));

  // 4. If enough high-quality images, mark pack as ready
  const approvedCount = assets.filter(a => {
    // Re-read after update
    return true; // Placeholder
  }).length;

  if (approvedCount >= 8) {
    await db.update(characterReferencePacks).set({
      status: 'ready',
      approvedAt: new Date(),
    }).where(eq(characterReferencePacks.id, referencePackId));

    // Update character
    await db.update(characters).set({
      status: 'ready',
      referencePackId,
      updatedAt: new Date(),
    }).where(eq(characters.id, characterId));
  } else {
    await db.update(characterReferencePacks).set({
      status: 'rejected',
    }).where(eq(characterReferencePacks.id, referencePackId));
  }
}, {
  connection: { host: 'localhost', port: 6379 },
  concurrency: 2,
});

async function evaluateImageQuality(
  asset: any,
  characterId: string,
): Promise<number> {
  // TODO: Use vision model or heuristic
  // Placeholder: return 0.7–0.95 range
  return 0.7 + Math.random() * 0.25;
}

async function evaluateIdentityMatch(
  asset: any,
  characterId: string,
): Promise<number> {
  // TODO: Use face embedding comparison (pgvector)
  // Placeholder: return 0.6–0.95 range
  return 0.6 + Math.random() * 0.35;
}
```

---

## 7. identity-validation Worker

### Purpose
Verify that newly generated images match the character's canonical identity. Detect and reject identity drift.

### Trigger
- After each reference image generation
- Before approving a reference pack

```typescript
// apps/worker/src/handlers/identity-validation.handler.ts

export interface IdentityValidationJob {
  jobType: 'identity-validation';
  characterId: string;
  /** Specific asset to validate, or null = validate all pending */
  assetId?: string;
}

const identityValidationWorker = new Worker('character', async (job: Job<IdentityValidationJob>) => {
  const { characterId, assetId } = job.data;
  const db = getDb();

  // 1. Load character's canonical identity
  const [char] = await db.select().from(characters)
    .where(eq(characters.id, characterId)).limit(1);
  if (!char) return;

  // 2. Get assets to validate
  const assets = assetId
    ? await db.select().from(characterReferenceAssets)
        .where(and(
          eq(characterReferenceAssets.characterId, characterId),
          eq(characterReferenceAssets.id, assetId),
        ))
    : await db.select().from(characterReferenceAssets)
        .where(and(
          eq(characterReferenceAssets.characterId, characterId),
          eq(characterReferenceAssets.identityScore, '0.0'), // Not yet scored
        ));

  // 3. For each asset, compare against canonical description
  for (const asset of assets) {
    // Use vision LLM to verify identity consistency
    const prompt = buildIdentityValidationPrompt(char, asset);

    const result = await alibabaChat({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: asset.mediaUrl } },
            { type: 'text', text: prompt },
          ],
        },
      ],
      model: 'qwen3.5-flash',  // Vision-capable
      temperature: 0.1,
      maxTokens: 100,
    });

    // Parse identity score from LLM response
    const score = parseIdentityScore(result.content);

    await db.update(characterReferenceAssets).set({
      identityScore: String(score),
      approved: score > 0.7,  // Threshold: 70% identity match
    }).where(eq(characterReferenceAssets.id, asset.id));

    // If identity drift detected, mark for rejection
    if (score < 0.5) {
      await job.log(`Identity drift detected for asset ${asset.id}: score ${score}`);
    }
  }
}, {
  connection: { host: 'localhost', port: 6379 },
  concurrency: 1,
});

function buildIdentityValidationPrompt(char: any, asset: any): string {
  return `You are an identity verification system. Compare this image to the character description below.

CHARACTER:
- Name: ${char.name}
- Gender: ${char.gender || 'unspecified'}
- Age: ${char.ageDisplay || 'adult'}
- Description: ${char.description || ''}
- Appearance notes: ${char.facialFeatures || ''} ${char.hair || ''} ${char.eyeColor || ''} ${char.skinTone || ''}

Rate how well this image matches the character identity on a scale of 0.0 to 1.0:
- 1.0: Perfect match — same person, consistent appearance
- 0.7-0.9: Good match — likely the same person, minor differences
- 0.4-0.6: Partial match — some features align, noticeable differences
- 0.0-0.3: Poor match — looks like a different person

Return ONLY a number between 0.0 and 1.0. No explanation.`;
}

function parseIdentityScore(response: string): number {
  const match = response.match(/([01]\.\d+)/);
  return match ? clamp(parseFloat(match[1])) : 0.5;
}
```

---

## 8. cleanup Worker

### Purpose
Periodic maintenance tasks to keep the database and storage lean.

### Trigger
- Scheduled: every hour

```typescript
// apps/worker/src/handlers/cleanup.handler.ts

export interface CleanupJob {
  jobType: 'cleanup';
}

const cleanupWorker = new Worker('maintenance', async (job: Job<CleanupJob>) => {
  const db = getDb();
  const now = new Date();

  // 1. Expire old stories (24h lifespan)
  const expiredStories = await db.update(stories)
    .set({ status: 'expired', updatedAt: now })
    .where(and(
      eq(stories.status, 'published'),
      sql`${stories.expiresAt} < NOW()`,
    ))
    .returning({ id: stories.id });

  await job.log(`Expired ${expiredStories.length} stories`);

  // 2. Clean up expired memories
  const expiredMemories = await db.delete(characterMemories)
    .where(and(
      sql`${characterMemories.expiresAt} IS NOT NULL`,
      sql`${characterMemories.expiresAt} < NOW()`,
    ));

  await job.log(`Cleaned up expired memories`);

  // 3. Remove failed generation jobs older than 7 days
  const oldJobs = await db.delete(generationJobs)
    .where(and(
      eq(generationJobs.status, 'failed'),
      sql`${generationJobs.createdAt} < NOW() - INTERVAL '7 days'`,
    ));

  await job.log(`Removed ${oldJobs.length} old failed generation jobs`);

  // 4. Clean orphaned media assets (no references)
  // TODO: Query media_assets without any character_reference_assets or message_attachments
  // const orphanedMedia = await db.delete(mediaAssets).where(...)

  // 5. Archive old conversations (inactive > 90 days)
  // TODO: Soft-delete old conversations

  // 6. Rotate old idempotency keys (> 24h old)
  // TODO: Clear old clientIdempotencyKey entries

  await job.log('Cleanup complete');
}, {
  connection: { host: 'localhost', port: 6379 },
  limiter: { max: 1, duration: 3600000 }, // Once per hour
});
```

---

## Worker Bootstrap

```typescript
// apps/worker/src/worker.service.ts — Target Implementation

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue, Worker, QueueScheduler } from 'bullmq';
import { getConfig } from '@itchats/config';

@Injectable()
export class WorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerService.name);
  private schedulers: QueueScheduler[] = [];

  async onModuleInit() {
    const config = getConfig();
    const connection = {
      host: config.REDIS_URL?.split('@')[1]?.split(':')[0] || 'localhost',
      port: 6379,
    };

    this.logger.log('🚀 Worker service initializing...');

    // ── Queues ──
    const characterQueue = new Queue('character', { connection });
    const socialQueue = new Queue('social', { connection });
    const mediaQueue = new Queue('media', { connection });
    const maintenanceQueue = new Queue('maintenance', { connection });

    // ── Schedulers (required for delayed/repeatable jobs) ──
    this.schedulers = [
      new QueueScheduler('character', { connection }),
      new QueueScheduler('social', { connection }),
      new QueueScheduler('media', { connection }),
      new QueueScheduler('maintenance', { connection }),
    ];

    // ── Repeatable Jobs ──
    await socialQueue.add('autonomous-story', {}, {
      repeat: { pattern: '*/15 * * * *' },
      jobId: 'autonomous-story',
    });

    await socialQueue.add('autonomous-life', {}, {
      repeat: { pattern: '*/15 * * * *' },
      jobId: 'autonomous-life',
    });

    await socialQueue.add('relationship-update', {}, {
      repeat: { pattern: '0 */6 * * *' },  // Every 6 hours
      jobId: 'relationship-update',
    });

    await maintenanceQueue.add('cleanup', {}, {
      repeat: { pattern: '0 * * * *' },  // Every hour
      jobId: 'cleanup',
    });

    this.logger.log('✅ Worker service initialized with queues and repeatable jobs');
  }

  async onModuleDestroy() {
    for (const scheduler of this.schedulers) {
      await scheduler.close();
    }
  }
}
```

---

## Queue Summary

| Queue         | Job Type              | Trigger            | Concurrency | Rate Limit    |
|---------------|-----------------------|--------------------|-------------|---------------|
| character     | generate-reference-pack | On character create | 1          | —             |
| character     | identity-validation   | After ref pack gen  | 1           | —             |
| social        | autonomous-story      | Every 15 min        | 2           | —             |
| social        | autonomous-life       | Every 15 min        | —           | 1/15min       |
| social        | memory-extraction     | After each AI msg   | 4           | 20/min        |
| social        | relationship-update   | Every 6 hours       | —           | —             |
| media         | image-ranking         | After ref pack gen  | 2           | —             |
| maintenance   | cleanup               | Every hour          | —           | 1/hour        |

---

## Migration from In-Process to Worker

### Current → Target Mapping

| Current Location                          | Current Method        | Target Queue      | Target Handler              |
|-------------------------------------------|-----------------------|-------------------|-----------------------------|
| `ai.service.ts` → `extractMemory()`       | Inline, fire-and-forget | `social`         | `memory.handler.ts`         |
| `ai.service.ts` → `autoReact()`           | Inline, fire-and-forget | `social`         | (keep inline — very cheap)  |
| `story-scheduler.service.ts` → `tick()`   | `setInterval` in API   | `social`          | `story.handler.ts`          |
| `character-creation.service.ts` → image gen | Inline in API        | `character`       | `character-identity.handler.ts` |
| N/A (not yet built)                       | —                     | `social`          | `relationship.handler.ts`   |
| N/A (not yet built)                       | —                     | `social`          | `autonomous-life.handler.ts`|
| N/A (not yet built)                       | —                     | `media`           | `image-ranking.handler.ts`  |
| N/A (not yet built)                       | —                     | `character`       | `identity-validation.handler.ts` |
| N/A (not yet built)                       | —                     | `maintenance`     | `cleanup.handler.ts`        |

### API → Worker Communication

Jobs are enqueued via BullMQ from the API:

```typescript
// apps/api — enqueue from any service
import { Queue } from 'bullmq';

const socialQueue = new Queue('social', {
  connection: { host: 'localhost', port: 6379 },
});

// After AI response, instead of inline:
await socialQueue.add('memory-extraction', {
  jobType: 'memory-extraction',
  characterId,
  userId,
  conversationId,
  userMessage,
  aiResponse,
});
```

---

## Dependencies

```
apps/worker
  ├── bullmq                     (queue library)
  ├── ioredis                    (Redis client)
  ├── @itchats/database          (DB queries)
  ├── @itchats/ai-core           (AI providers, prompts, costing)
  ├── @itchats/config            (environment config)
  └── Redis (required for BullMQ)

Infrastructure:
  ├── Redis server               (for queue persistence)
  ├── PostgreSQL                 (data store)
  └── PM2 / Docker               (process management)
```
