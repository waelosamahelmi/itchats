import { Job } from 'bullmq';
import { getDb } from '@itchats/database';
import { generationJobs, usageEvents, creditWallets, creditLedger, mediaAssets } from '@itchats/database/schema';
import { eq, sql } from 'drizzle-orm';
import { alibabaTextToImageWithFallback, alibabaImageToImage } from '@itchats/ai-core';
import { getCreditCost } from '@itchats/ai-core/costing';
import type { ImageGenerationJob } from '../queues';

export async function imageGenerationProcessor(job: Job<ImageGenerationJob>) {
  const db = getDb();
  const { jobId, generationType, prompt, imageUrl, model, userId, characterId } = job.data;

  const [genJob] = await db.select().from(generationJobs).where(eq(generationJobs.id, jobId)).limit(1);
  if (!genJob) throw new Error(`Generation job ${jobId} not found`);
  if (genJob.status === 'cancelled') return { skipped: true, reason: 'cancelled' };

  await db.update(generationJobs).set({
    status: 'processing', startedAt: new Date(),
    attemptCount: sql`${generationJobs.attemptCount} + 1`,
  }).where(eq(generationJobs.id, jobId));

  try {
    let imageUrl_: string;
    let usedModel: string;

    if (generationType === 'image_to_image' && imageUrl) {
      const result = await alibabaImageToImage({ prompt, imageBase64: imageUrl, model });
      imageUrl_ = result.url;
      usedModel = result.model;
    } else {
      const result = await alibabaTextToImageWithFallback({ prompt, model });
      imageUrl_ = result.url;
      usedModel = result.model;
    }

    const [asset] = await db.insert(mediaAssets).values({
      ownerUserId: userId, visibility: 'private',
      storageProvider: 'alibaba', bucket: 'dashscope-output',
      objectKey: imageUrl_, mimeType: 'image/png', mediaType: 'image',
      metadata: { generatedBy: 'image-processor', prompt: prompt.slice(0, 500), model: usedModel },
    }).returning();

    await db.update(generationJobs).set({
      status: 'succeeded',
      responseJson: { imageUrl: imageUrl_, mediaAssetId: asset!.id, model: usedModel },
      completedAt: new Date(),
    }).where(eq(generationJobs.id, jobId));

    const cost = getCreditCost(usedModel, generationType, {});
    await db.insert(usageEvents).values({
      userId, characterId, generationJobId: jobId,
      providerId: 'alibaba', generationType,
      imageCount: 1, providerCostUsd: '0.02',
      creditsDebited: cost,
      pricingSnapshot: { model: usedModel, credits: cost },
    });

    await db.update(creditWallets).set({
      balance: sql`GREATEST(0, ${creditWallets.balance} - ${cost})`,
      lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${cost}`,
      updatedAt: new Date(),
    }).where(eq(creditWallets.userId, userId));

    const [wallet] = await db.select({ balance: creditWallets.balance })
      .from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);

    await db.insert(creditLedger).values({
      userId, delta: -cost, balanceAfter: wallet?.balance ?? 0,
      reason: `Image generation: ${generationType}`,
      referenceType: 'generation_job', referenceId: jobId,
    });

    return { success: true, imageUrl: imageUrl_, mediaAssetId: asset!.id };
  } catch (err: any) {
    await db.update(generationJobs).set({
      status: 'failed', errorCode: 'PROVIDER_ERROR',
      errorMessageSafe: String(err.message).slice(0, 500), completedAt: new Date(),
    }).where(eq(generationJobs.id, jobId));
    throw err;
  }
}
