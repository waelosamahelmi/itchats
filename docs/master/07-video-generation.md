# 07 — Video Generation Pipeline

## Overview

The Video Generation Pipeline creates short video clips of AI characters using Alibaba's Wanx video models. Videos can be generated from text prompts only (T2V) or from a reference image + prompt (I2V — Image-to-Video). The pipeline handles the async task-based nature of video generation, polling for completion, identity verification, and fallback chains.

Key characteristics:
- **Async**: Video generation takes 30-120 seconds via task-based API
- **Two modes**: Text-to-Video (T2V) and Image-to-Video (I2V)
- **Identity anchoring**: I2V uses canonical reference images to maintain character identity
- **Quality tiers**: Standard (720p) and Premium (1080p)
- **Duration**: 5 seconds default, configurable up to 10 seconds

---

## 1. Video Generation Modes

### 1.1 Mode Comparison

| Feature | Text-to-Video (T2V) | Image-to-Video (I2V) |
|---------|---------------------|----------------------|
| **Input** | Prompt only | Reference image + prompt |
| **Identity consistency** | Low (face may drift) | High (anchored to reference image) |
| **Use case** | Generic aesthetic clips, B-roll | Character videos (stories, selfies) |
| **Model** | wan2.1-t2v-turbo, wan2.7-t2v | wan2.1-i2v-turbo, wan2.7-i2v, wan2.6-i2v-flash |
| **Latency** | 60-120s | 60-120s |
| **Cost (5s 720p)** | ~0.125 USD | ~0.125 USD |

**Rule**: Character videos MUST use I2V with a canonical reference image to prevent identity drift. T2V is only for non-character content (abstract, environmental).

### 1.2 Video Types

```typescript
// packages/ai-core/src/video/types.ts

type VideoGenerationType =
  | 'character_story'      // Character story video (I2V required)
  | 'character_selfie'     // Character sends a short video selfie (I2V required)
  | 'user_character'       // User requests a video of a character (I2V)
  | 'generic_t2v'          // Generic T2V — no character identity
  | 'environmental';       // Scenery/atmosphere clip (T2V)

interface VideoGenerationRequest {
  type: VideoGenerationType;
  characterId?: string;          // Required for character videos
  userId: string;
  prompt: string;
  referenceImageUrl?: string;    // Required for I2V
  duration?: number;             // Default 5, max 10
  quality?: '720p' | '1080p';   // Default 720p
  hasAudio?: boolean;            // Default false
}

interface VideoTask {
  taskId: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  model: string;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}
```

---

## 2. Video Provider Interface

### 2.1 Existing Alibaba Implementation

The current implementation in `packages/ai-core/src/providers/alibaba.ts` already handles:

```typescript
// TTV (Text-to-Video)
export async function alibabaTextToVideo(request: TextToVideoRequest): Promise<{ taskId: string; status: string }> {
  // POST to /aigc/video-generation/video-synthesis with X-DashScope-Async: enable
  // Returns taskId for polling
}

// ITV (Image-to-Video)  
export async function alibabaImageToVideo(request: ImageToVideoRequest): Promise<{ taskId: string; status: string }> {
  // POST with prompt + image (base64)
  // Returns taskId for polling
}

// Poll for result
export async function alibabaGetVideoResult(taskId: string): Promise<{ url?: string; status: string }> {
  // GET /aigc/video-generation/video-synthesis/{taskId}
}
```

### 2.2 Video Models

```typescript
// T2V models in fallback order
const TTV_FALLBACK_MODELS = [
  'wan2.1-t2v-turbo',    // Fastest T2V
  'wan2.7-t2v',          // Latest gen
  'wan2.1-t2v-plus',     // Higher quality
  'wan2.6-t2v',          // Previous gen
];

// I2V models in fallback order
const ITV_FALLBACK_MODELS = [
  'wan2.1-i2v-turbo',    // Fastest I2V
  'wan2.7-i2v',          // Latest gen, best quality
  'wan2.1-i2v-plus',     // Higher quality
  'wan2.6-i2v',          // Previous gen
];

// Quick mode (faster, lower quality) for stories
const I2V_FLASH_MODELS = [
  'wan2.6-i2v-flash',    // Fast generation for stories
];
```

---

## 3. VideoGenerationService

### 3.1 Core Service

```typescript
// apps/api/src/media/video-generation.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { 
  characters, characterReferenceAssets, generationJobs, 
  usageEvents, creditWallets, creditLedger, characterRelationships,
} from '@itchats/database/schema';
import { 
  alibabaTextToVideo, alibabaImageToVideo, alibabaGetVideoResult,
} from '@itchats/ai-core';
import { getCreditCost } from '@itchats/ai-core/costing';
import { eq, and, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

@Injectable()
export class VideoGenerationService {
  private readonly logger = new Logger(VideoGenerationService.name);
  
  /** In-memory task tracking for active video generations */
  private activeTasks = new Map<string, VideoTask>();
  
  /** Polling interval reference */
  private pollInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    // Start polling for video task completions every 10 seconds
    this.startPolling();
  }
  
  /**
   * Generate a character video using Image-to-Video.
   * Uses a canonical reference image to anchor identity.
   */
  async generateCharacterVideo(
    characterId: string,
    userId: string,
    request: {
      prompt: string;
      duration?: number;
      quality?: '720p' | '1080p';
      videoType: 'character_story' | 'character_selfie';
    },
  ): Promise<VideoTask> {
    const db = getDb();
    
    // 1. Validate character exists and is locked
    const [char] = await db.select().from(characters)
      .where(eq(characters.id, characterId)).limit(1);
    
    if (!char) throw new Error('Character not found');
    if (!char.identityLock) {
      throw new Error('Character identity must be locked before generating videos');
    }
    
    // 2. Get a canonical reference image
    const referenceImage = await this.getCanonicalReferenceImage(characterId);
    if (!referenceImage) {
      throw new Error('No canonical reference image found. Generate reference pack first.');
    }
    
    // 3. Calculate cost
    const quality = request.quality || '720p';
    const duration = Math.min(request.duration || 5, 10);
    const hasAudio = false;  // MVP: silent videos
    const cost = getCreditCost('wan2.6-i2v-flash', 'image_to_video', {
      seconds: duration,
      quality,
      hasAudio: hasAudio ? 1 : 0,
    });
    
    // 4. Check credits
    const [wallet] = await db.select().from(creditWallets)
      .where(eq(creditWallets.userId, userId)).limit(1);
    
    if ((wallet?.balance ?? 0) < cost) {
      throw new Error(`Insufficient credits: need ${cost}, have ${wallet?.balance ?? 0}`);
    }
    
    // 5. Build I2V prompt with identity context
    const identityPrompt = this.buildCharacterVideoPrompt(char, request.prompt, request.videoType);
    
    // 6. Submit I2V job
    const { taskId, status } = await alibabaImageToVideo({
      prompt: identityPrompt,
      imageBase64: referenceImage,  // Base64 of the reference image
    });
    
    // 7. Record generation job
    const [job] = await db.insert(generationJobs).values({
      userId,
      characterId,
      generationType: 'image_to_video',
      status: 'processing',
      routeKey: quality === '1080p' ? 'video.premium' : 'video.standard',
      idempotencyKey: randomUUID(),
      requestJson: {
        prompt: identityPrompt,
        duration,
        quality,
        videoType: request.videoType,
        referenceImageId: referenceImage,
      },
      startedAt: new Date(),
    }).returning();
    
    // 8. Debit credits
    await db.update(creditWallets).set({
      balance: sql`GREATEST(0, ${creditWallets.balance} - ${cost})`,
      lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${cost}`,
      updatedAt: new Date(),
    }).where(eq(creditWallets.userId, userId));
    
    await db.insert(creditLedger).values({
      userId,
      delta: -cost,
      balanceAfter: Math.max(0, (wallet?.balance ?? 0) - cost),
      reason: `Character video: ${request.videoType}`,
      referenceType: 'generation_job',
      referenceId: job!.id,
    });
    
    // 9. Track task for polling
    const videoTask: VideoTask = {
      taskId,
      status: 'PENDING',
      model: 'wan2.6-i2v-flash',
      createdAt: new Date(),
      userData: { jobId: job!.id, characterId, userId, cost, quality, duration },
    };
    
    this.activeTasks.set(taskId, videoTask);
    
    // 10. Update relationship stats
    await db.update(characterRelationships).set({
      voiceCalls: sql`COALESCE(${characterRelationships.voiceCalls}, 0) + 1`,
      updatedAt: new Date(),
    }).where(and(
      eq(characterRelationships.characterId, characterId),
      eq(characterRelationships.userId, userId),
    ));
    
    return videoTask;
  }
  
  /**
   * Generate a generic text-to-video (no character identity).
   */
  async generateTextToVideo(
    userId: string,
    request: {
      prompt: string;
      duration?: number;
      quality?: '720p' | '1080p';
    },
  ): Promise<VideoTask> {
    const db = getDb();
    
    const quality = request.quality || '720p';
    const duration = Math.min(request.duration || 5, 10);
    const cost = getCreditCost('wan2.6-i2v-flash', 'text_to_video', {
      seconds: duration,
      quality,
      hasAudio: 0,
    });
    
    // Check credits + submit T2V job (similar to I2V but uses alibabaTextToVideo)
    const { taskId, status } = await alibabaTextToVideo({
      prompt: request.prompt,
      duration,
    });
    
    const [job] = await db.insert(generationJobs).values({
      userId,
      generationType: 'text_to_video',
      status: 'processing',
      routeKey: 'video.standard',
      idempotencyKey: randomUUID(),
      requestJson: { prompt: request.prompt, duration, quality },
      startedAt: new Date(),
    }).returning();
    
    const videoTask: VideoTask = {
      taskId,
      status: 'PENDING',
      model: 'wan2.1-t2v-turbo',
      createdAt: new Date(),
      userData: { jobId: job!.id, userId, cost, quality, duration },
    };
    
    this.activeTasks.set(taskId, videoTask);
    
    return videoTask;
  }
  
  /**
   * Check the status of a video generation task.
   */
  async getTaskStatus(taskId: string): Promise<VideoTask | null> {
    // Check in-memory cache first
    const cached = this.activeTasks.get(taskId);
    
    // Poll the provider for current status
    try {
      const result = await alibabaGetVideoResult(taskId);
      
      const task: VideoTask = {
        taskId,
        status: result.status as VideoTask['status'],
        videoUrl: result.url,
        model: cached?.model || 'unknown',
        createdAt: cached?.createdAt || new Date(),
        completedAt: result.status === 'SUCCEEDED' ? new Date() : undefined,
      };
      
      // Update cache
      this.activeTasks.set(taskId, task);
      
      // If completed successfully, persist results
      if (task.status === 'SUCCEEDED' && cached?.userData) {
        await this.finalizeVideoTask(task, cached.userData);
      }
      
      return task;
    } catch (err: any) {
      this.logger.error(`Failed to poll video task ${taskId}: ${err.message}`);
      return cached || null;
    }
  }
  
  /**
   * Finalize a completed video task: update generation job + usage events.
   */
  private async finalizeVideoTask(
    task: VideoTask,
    userData: { jobId: string; characterId?: string; userId: string; cost: number; quality: string; duration: number },
  ): Promise<void> {
    const db = getDb();
    
    await db.update(generationJobs).set({
      status: 'succeeded',
      responseJson: {
        videoUrl: task.videoUrl,
        model: task.model,
        duration: userData.duration,
        quality: userData.quality,
      },
      completedAt: new Date(),
    }).where(eq(generationJobs.id, userData.jobId));
    
    await db.insert(usageEvents).values({
      userId: userData.userId,
      characterId: userData.characterId,
      generationJobId: userData.jobId,
      providerId: 'alibaba',
      generationType: userData.characterId ? 'image_to_video' : 'text_to_video',
      videoSeconds: String(userData.duration),
      providerCostUsd: '0.1250',
      creditsDebited: userData.cost,
      pricingSnapshot: {
        model: task.model,
        credits: userData.cost,
        seconds: userData.duration,
        quality: userData.quality,
      },
    });
  }
  
  /**
   * Build an I2V prompt that anchors to the character's identity.
   * The reference image provides the visual anchor — the prompt describes motion.
   */
  private buildCharacterVideoPrompt(
    char: any,
    userContext: string,
    videoType: 'character_story' | 'character_selfie',
  ): string {
    const baseDescription = `${char.name}, a ${char.gender || 'person'} in ${char.ageDisplay || 'their prime'}.
Appearance: ${char.description || ''}. ${char.personality || ''}`;
    
    const motionPrompts: Record<string, string> = {
      character_story: `${baseDescription.substring(0, 300)}. 
${userContext || 'Natural casual movement, looking around, slight smile, ambient scene'}. 
Smooth motion, cinematic, natural lighting. The person in the reference image — they move naturally.`,
      character_selfie: `${baseDescription.substring(0, 300)}. 
Selfie video style, looking at camera, slight movement, genuine expression. 
${userContext || 'Waving or smiling at the camera'}. 
Smartphone front camera quality, slight handheld shake, casual.`,
    };
    
    return motionPrompts[videoType] || userContext;
  }
  
  /**
   * Get a canonical reference image (base64) for I2V anchoring.
   * Prioritizes portrait images for best face anchoring.
   */
  private async getCanonicalReferenceImage(characterId: string): Promise<string | null> {
    const db = getDb();
    
    // Get approved reference images, prioritizing portrait types
    const refs = await db.select({
      id: characterReferenceAssets.id,
      mediaAssetId: characterReferenceAssets.mediaAssetId,
      referenceType: characterReferenceAssets.referenceType,
    }).from(characterReferenceAssets)
      .where(and(
        eq(characterReferenceAssets.characterId, characterId),
        eq(characterReferenceAssets.approved, true),
      ))
      .orderBy(sql`CASE 
        WHEN ${characterReferenceAssets.referenceType} = 'portrait' THEN 0
        WHEN ${characterReferenceAssets.referenceType} = 'portrait_smile' THEN 1
        WHEN ${characterReferenceAssets.referenceType} = 'selfie' THEN 2
        ELSE 3
      END`)
      .limit(1);
    
    if (refs.length === 0) return null;
    
    // TODO: Fetch actual image data from media storage and convert to base64
    // For now, return the asset ID (caller handles retrieval)
    const mediaAsset = await db.select().from(mediaAssets)
      .where(eq(mediaAssets.id, refs[0].mediaAssetId))
      .limit(1);
    
    return mediaAsset[0]?.url || null;
  }
  
  /**
   * Start polling for video task completions.
   * Runs every 10 seconds, checking all active tasks.
   */
  private startPolling(): void {
    this.pollInterval = setInterval(async () => {
      if (this.activeTasks.size === 0) return;
      
      const pendingTasks = [...this.activeTasks.entries()]
        .filter(([, task]) => task.status === 'PENDING' || task.status === 'PROCESSING');
      
      for (const [taskId] of pendingTasks) {
        try {
          await this.getTaskStatus(taskId);
        } catch (err: any) {
          this.logger.error(`Poll error for ${taskId}: ${err.message}`);
        }
      }
      
      // Clean up completed/failed tasks older than 1 hour
      const oneHourAgo = Date.now() - 3600000;
      for (const [taskId, task] of this.activeTasks.entries()) {
        if (
          (task.status === 'SUCCEEDED' || task.status === 'FAILED') &&
          task.createdAt.getTime() < oneHourAgo
        ) {
          this.activeTasks.delete(taskId);
        }
      }
    }, 10000);
  }
  
  onModuleDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
}
```

---

## 4. Fallback Chain for Video

### 4.1 Model Fallback

```typescript
// In alibabaImageToVideo (existing):
// Tries models in order: [requested model, ...ITV_FALLBACK_MODELS]
// Each attempt: POST /aigc/video-generation/video-synthesis
// On failure: next model
// On success: return taskId

const ITV_FALLBACK_MODELS = [
  'wan2.1-i2v-turbo',   // Fast (30-60s)
  'wan2.7-i2v',          // Best quality (60-120s)
  'wan2.1-i2v-plus',     // Good balance
  'wan2.6-i2v',          // Previous gen
  'wan2.6-i2v-flash',    // Fastest (15-30s)
];
```

### 4.2 Quality Degradation

If premium (1080p) fails, fall back to 720p:

```typescript
async function generateWithQualityFallback(
  request: VideoGenerationRequest,
): Promise<VideoTask> {
  try {
    return await generateAtQuality(request, '1080p');
  } catch (err) {
    this.logger.warn(`1080p video failed, falling back to 720p: ${err}`);
    return await generateAtQuality(request, '720p');
  }
}
```

---

## 5. Video Storage & Delivery

### 5.1 Storage Flow

```
1. Video generation completes → provider URL (temporary, ~2 hours)
2. Download video from provider URL
3. Upload to permanent storage (S3/R2 — via media service)
4. Store permanent URL in stories/media table
5. Generate thumbnail (first frame or midpoint)
```

### 5.2 Media Handling

```typescript
interface VideoMedia {
  id: string;
  url: string;           // Permanent CDN URL
  thumbnailUrl: string;  // First-frame thumbnail
  duration: number;      // Seconds
  quality: '720p' | '1080p';
  format: 'mp4';
  sizeBytes: number;
  characterId?: string;
  storyId?: string;
}
```

---

## 6. Rate Limiting & Fair Use

```typescript
// Per-user rate limits
const VIDEO_RATE_LIMITS = {
  free_tier:    { perDay: 1,  perWeek: 3  },
  premium_tier: { perDay: 5,  perWeek: 20 },
  pro_tier:     { perDay: 15, perWeek: 60 },
};
```

---

## 7. Credit Costs

| Video Type | Model | Duration | Quality | Audio | Credits |
|-----------|-------|----------|---------|-------|---------|
| Character Story | wan2.6-i2v-flash | 5s | 720p | Silent | 156 |
| Character Story | wan2.6-i2v-flash | 5s | 1080p | Silent | 234 |
| Character Selfie | wan2.1-i2v-turbo | 5s | 720p | Silent | 156 |
| Premium Character | wan2.7-i2v | 5s | 1080p | Audio | 938 |
| Generic T2V | wan2.1-t2v-turbo | 5s | 720p | Silent | 156 |
| Generic T2V | wan2.7-t2v | 5s | 1080p | Audio | 938 |

---

## 8. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/videos/generate` | Start video generation (T2V or I2V) |
| `GET` | `/videos/:taskId/status` | Poll video generation status |
| `GET` | `/videos/:taskId` | Get completed video (redirects to CDN) |
| `POST` | `/characters/:id/videos/story` | Generate character story video |
| `POST` | `/characters/:id/videos/selfie` | Generate character selfie video |
| `GET` | `/characters/:id/videos` | List character's generated videos |

---

## 9. Pseudocode: Complete Video Generation Flow

```typescript
async function generateCharacterStoryVideo(
  characterId: string,
  userId: string,
  storyCaption: string,
) {
  // 1. Load character DNA + get canonical reference image
  const dna = await getCharacterDNA(characterId);
  const referenceImage = await getCanonicalPortraitBase64(characterId);
  
  // 2. Build motion prompt from caption + DNA context
  const motionPrompt = `
    ${dna.canonicalName} in a short video. ${storyCaption}.
    ${dna.physical.gender}, ${dna.physical.ageDisplay}, ${dna.physical.appearance}. 
    Natural movement, cinematic quality. The person from the reference image.
  `;
  
  // 3. Submit I2V job
  const task = await videoGenerationService.generateCharacterVideo(
    characterId, userId, {
      prompt: motionPrompt,
      videoType: 'character_story',
      duration: 5,
      quality: '720p',
    },
  );
  
  // 4. Return task ID — frontend polls for completion
  return {
    taskId: task.taskId,
    status: task.status,
    estimatedCompletionMs: 60000,  // ~60 seconds
    creditsDeducted: 156,
  };
  
  // 5. Backend polling loop (runs every 10s):
  //    - Check task status via alibabaGetVideoResult(taskId)
  //    - On SUCCEEDED: download video, upload to storage, generate thumbnail
  //    - Update story record with video URL
  //    - Notify user (push notification / WebSocket)
}
```
