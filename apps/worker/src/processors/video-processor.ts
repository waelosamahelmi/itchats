import { Job } from 'bullmq';
import { getDb } from '@itchats/database';
import { generationJobs, usageEvents, creditWallets, creditLedger, mediaAssets } from '@itchats/database/schema';
import { eq, sql } from 'drizzle-orm';
import {
  alibabaTextToVideo,
  alibabaImageToVideo,
  alibabaGetVideoResult,
} from '@itchats/ai-core';
import { getCreditCost } from '@itchats/ai-core/costing';
import type { VideoGenerationJob } from '../queues';

const POLL_INTERVAL_MS = 15_000;
const MAX_POLL_ATTEMPTS = 120; // 30 minutes max
const MAX_CONSECUTIVE_ERRORS = 20;

/**
 * Video generation processor.
 *
 * Flow:
 * 1. Receive job from BullMQ queue
 * 2. Update generation_jobs status → 'processing'
 * 3. Call Alibaba text-to-video or image-to-video (returns taskId)
 * 4. Poll alibabaGetVideoResult() every 15s until SUCCEEDED or FAILED
 * 5. On success: store video URL, create media_asset record, debit credits
 * 6. On failure: update job status, log error
 */
export async function videoGenerationProcessor(job: Job<VideoGenerationJob>) {
  const db = getDb();
  const { jobId, generationType, prompt, imageBase64, model, userId, characterId } = job.data;

  const [genJob] = await db.select().from(generationJobs).where(eq(generationJobs.id, jobId)).limit(1);
  if (!genJob) throw new Error(`Generation job ${jobId} not found`);
  if (genJob.status === 'cancelled') return { skipped: true, reason: 'cancelled' };

  // Mark as processing
  await db.update(generationJobs).set({
    status: 'processing',
    startedAt: new Date(),
    attemptCount: sql`${generationJobs.attemptCount} + 1`,
  }).where(eq(generationJobs.id, jobId));

  // Submit video generation
  let taskId: string;
  try {
    if (generationType === 'image_to_video' || generationType === 'reference_to_video') {
      if (!imageBase64) throw new Error('imageBase64 required for image-to-video');
      const result = await alibabaImageToVideo({ prompt, imageBase64, model });
      taskId = result.taskId;
    } else {
      const result = await alibabaTextToVideo({ prompt, model });
      taskId = result.taskId;
    }
  } catch (err: any) {
    await db.update(generationJobs).set({
      status: 'failed',
      errorCode: 'PROVIDER_SUBMIT_ERROR',
      errorMessageSafe: String(err.message).slice(0, 500),
      completedAt: new Date(),
    }).where(eq(generationJobs.id, jobId));
    throw err;
  }

  // Poll for completion
  let consecutiveErrors = 0;
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    // Check if job was cancelled during polling
    const [current] = await db.select({ status: generationJobs.status })
      .from(generationJobs).where(eq(generationJobs.id, jobId)).limit(1);
    if (current?.status === 'cancelled') {
      return { skipped: true, reason: 'cancelled-during-polling' };
    }

    try {
      const result = await alibabaGetVideoResult(taskId);

      if (result.status === 'SUCCEEDED' && result.url) {
        // Create media asset record
        const [asset] = await db.insert(mediaAssets).values({
          ownerUserId: userId,
          visibility: 'private',
          storageProvider: 'alibaba',
          bucket: 'dashscope-output',
          objectKey: result.url,
          mimeType: 'video/mp4',
          mediaType: 'video',
          metadata: { generatedBy: 'video-processor', taskId, prompt: prompt.slice(0, 500) },
        }).returning();

        // Update generation job
        await db.update(generationJobs).set({
          status: 'succeeded',
          responseJson: { videoUrl: result.url, mediaAssetId: asset!.id, taskId },
          completedAt: new Date(),
        }).where(eq(generationJobs.id, jobId));

        // Record usage
        const cost = getCreditCost(model ?? 'wan2.7-t2v', generationType, {});
        await db.insert(usageEvents).values({
          userId, characterId, generationJobId: jobId,
          providerId: 'alibaba', generationType,
          videoSeconds: '5',
          providerCostUsd: '0.10',
          creditsDebited: cost,
          pricingSnapshot: { model: model ?? 'wan2.7-t2v', credits: cost },
        });

        // Debit wallet atomically
        await db.update(creditWallets).set({
          balance: sql`GREATEST(0, ${creditWallets.balance} - ${cost})`,
          lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${cost}`,
          updatedAt: new Date(),
        }).where(eq(creditWallets.userId, userId));

        const [wallet] = await db.select({ balance: creditWallets.balance })
          .from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);

        await db.insert(creditLedger).values({
          userId, delta: -cost,
          balanceAfter: wallet?.balance ?? 0,
          reason: `Video generation: ${generationType}`,
          referenceType: 'generation_job', referenceId: jobId,
        });

        return { success: true, videoUrl: result.url, mediaAssetId: asset!.id };
      }

      if (result.status === 'FAILED') {
        await db.update(generationJobs).set({
          status: 'failed',
          errorCode: 'PROVIDER_TASK_FAILED',
          errorMessageSafe: 'Video generation task failed on provider side',
          completedAt: new Date(),
        }).where(eq(generationJobs.id, jobId));
        throw new Error('Video generation task failed');
      }

      // Still processing — wait and retry
      consecutiveErrors = 0;
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    } catch (err: any) {
      consecutiveErrors++;
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        await db.update(generationJobs).set({
          status: 'failed',
          errorCode: 'POLLING_EXHAUSTED',
          errorMessageSafe: `Polling failed after ${consecutiveErrors} consecutive errors: ${String(err.message).slice(0, 300)}`,
          completedAt: new Date(),
        }).where(eq(generationJobs.id, jobId));
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS * 2));
    }
  }

  // Max attempts reached
  await db.update(generationJobs).set({
    status: 'failed',
    errorCode: 'POLLING_TIMEOUT',
    errorMessageSafe: `Video generation timed out after ${MAX_POLL_ATTEMPTS} polling attempts`,
    completedAt: new Date(),
  }).where(eq(generationJobs.id, jobId));
  throw new Error('Video generation timed out');
}
