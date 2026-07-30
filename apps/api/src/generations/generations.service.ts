import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { generationJobs, usageEvents } from '@itchats/database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Queue } from 'bullmq';

/**
 * Generation service — creates DB records and enqueues jobs to BullMQ.
 *
 * Pattern:
 * 1. Create generation_jobs row (status: queued)
 * 2. Enqueue to the appropriate BullMQ queue
 * 3. Worker picks up the job, sets status → processing → succeeded/failed
 * 4. Client polls GET /v1/generations/:jobId for status
 */

// Lazy-loaded queue references — set by the module
let _imageQueue: Queue | null = null;
let _videoQueue: Queue | null = null;

export function setGenerationQueues(imageQueue: Queue, videoQueue: Queue) {
  _imageQueue = imageQueue;
  _videoQueue = videoQueue;
}

@Injectable()
export class GenerationsService {
  async requestImage(userId: string, prompt: string, model?: string) {
    const db = getDb();
    const idempotencyKey = randomUUID();
    const [job] = await db.insert(generationJobs).values({
      userId,
      generationType: 'text_to_image',
      routeKey: model === 'premium' ? 'image.premium' : 'image.standard',
      idempotencyKey,
      requestJson: { prompt, model },
      status: 'queued',
    }).returning();

    // Enqueue to worker
    if (_imageQueue) {
      await _imageQueue.add('text-to-image', {
        jobId: job!.id,
        generationType: 'text_to_image',
        prompt,
        model,
        userId,
      });
    }

    return { jobId: job!.id, status: 'queued', idempotencyKey };
  }

  async requestImageEdit(userId: string, prompt: string, imageUrl: string) {
    const db = getDb();
    const idempotencyKey = randomUUID();
    const [job] = await db.insert(generationJobs).values({
      userId,
      generationType: 'image_to_image',
      routeKey: 'image.edit.private',
      idempotencyKey,
      requestJson: { prompt, imageUrl },
      status: 'queued',
    }).returning();

    if (_imageQueue) {
      await _imageQueue.add('image-to-image', {
        jobId: job!.id,
        generationType: 'image_to_image',
        prompt,
        imageUrl,
        userId,
      });
    }

    return { jobId: job!.id, status: 'queued', idempotencyKey };
  }

  async requestVideo(userId: string, prompt: string, imageBase64?: string) {
    const db = getDb();
    const generationType = imageBase64 ? 'image_to_video' : 'text_to_video';
    const [job] = await db.insert(generationJobs).values({
      userId,
      generationType,
      routeKey: 'video.standard',
      idempotencyKey: randomUUID(),
      requestJson: { prompt, imageBase64 },
      status: 'queued',
    }).returning();

    if (_videoQueue) {
      await _videoQueue.add(generationType, {
        jobId: job!.id,
        generationType,
        prompt,
        imageBase64,
        userId,
      });
    }

    return { jobId: job!.id, status: 'queued' };
  }

  async requestTTS(userId: string, text: string, voice?: string) {
    const db = getDb();
    const idempotencyKey = randomUUID();
    const [job] = await db.insert(generationJobs).values({
      userId,
      generationType: 'tts',
      routeKey: 'tts.standard',
      idempotencyKey,
      requestJson: { text, voice },
      status: 'queued',
    }).returning();
    return { jobId: job!.id, status: 'queued', idempotencyKey };
  }

  async requestASR(userId: string, audioUrl: string) {
    const db = getDb();
    const idempotencyKey = randomUUID();
    const [job] = await db.insert(generationJobs).values({
      userId,
      generationType: 'asr',
      routeKey: 'asr.standard',
      idempotencyKey,
      requestJson: { audioUrl },
      status: 'queued',
    }).returning();
    return { jobId: job!.id, status: 'queued', idempotencyKey };
  }

  async listJobs(userId: string) {
    const db = getDb();
    return db.select().from(generationJobs)
      .where(eq(generationJobs.userId, userId))
      .orderBy(desc(generationJobs.createdAt)).limit(20);
  }

  async getJob(userId: string, jobId: string) {
    const db = getDb();
    const [job] = await db.select().from(generationJobs).where(eq(generationJobs.id, jobId)).limit(1);
    if (!job || job.userId !== userId) return null;
    return job;
  }

  async cancelJob(userId: string, jobId: string) {
    const db = getDb();
    const [job] = await db.select().from(generationJobs).where(eq(generationJobs.id, jobId)).limit(1);
    if (!job || job.userId !== userId) throw new Error('Job not found or not owned by you');
    await db.update(generationJobs).set({ status: 'cancelled' })
      .where(and(eq(generationJobs.id, jobId), eq(generationJobs.userId, userId)));
    return { cancelled: true };
  }
}
