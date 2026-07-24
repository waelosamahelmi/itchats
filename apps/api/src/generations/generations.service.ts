import { Injectable } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { generationJobs, usageEvents } from '@itchats/database/schema';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

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
    return { jobId: job!.id, status: 'queued', idempotencyKey };
  }

  async requestVideo(userId: string, prompt: string) {
    const db = getDb();
    const idempotencyKey = randomUUID();
    const [job] = await db.insert(generationJobs).values({
      userId,
      generationType: 'text_to_video',
      routeKey: 'video.standard',
      idempotencyKey,
      requestJson: { prompt },
      status: 'queued',
    }).returning();
    return { jobId: job!.id, status: 'queued', idempotencyKey };
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
    await db.update(generationJobs).set({ status: 'cancelled' })
      .where(eq(generationJobs.id, jobId));
    return { cancelled: true };
  }
}
