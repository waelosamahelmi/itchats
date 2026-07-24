import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { generationJobs, usageEvents } from '@itchats/database/schema';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

@Controller('v1/generations')
export class GenerationsController {
  @Post('images')
  async createImage(@Body() body: { prompt: string; model?: string }) {
    const db = getDb();
    const idempotencyKey = randomUUID();
    const [job] = await db.insert(generationJobs).values({
      userId: '00000000-0000-0000-0000-000000000001',
      generationType: 'text_to_image',
      routeKey: 'image.standard',
      idempotencyKey,
      requestJson: body,
      status: 'queued',
    }).returning();
    return { jobId: job!.id, status: 'queued' };
  }

  @Get('jobs')
  async listJobs() {
    const db = getDb();
    return db.select().from(generationJobs).orderBy(desc(generationJobs.createdAt)).limit(20);
  }

  @Get(':jobId')
  async getJob(@Param('jobId') id: string) {
    const db = getDb();
    const [job] = await db.select().from(generationJobs).where(eq(generationJobs.id, id)).limit(1);
    return job ?? { error: 'Not found' };
  }
}
