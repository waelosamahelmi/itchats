import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { generationJobs } from '@itchats/database/schema';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('v1/generations')
export class GenerationsController {
  @Post('images')
  @UseGuards(JwtAuthGuard)
  async createImage(@Body() body: { prompt: string; model?: string }, @Req() req: any) {
    const db = getDb();
    const idempotencyKey = randomUUID();
    const [job] = await db.insert(generationJobs).values({
      userId: req.user.id,
      generationType: 'text_to_image',
      routeKey: 'image.standard',
      idempotencyKey,
      requestJson: body,
      status: 'queued',
    }).returning();
    return { jobId: job!.id, status: 'queued' };
  }

  @Get('jobs')
  @UseGuards(JwtAuthGuard)
  async listJobs(@Req() req: any) {
    const db = getDb();
    return db.select().from(generationJobs)
      .where(eq(generationJobs.userId, req.user.id))
      .orderBy(desc(generationJobs.createdAt)).limit(20);
  }

  @Get(':jobId')
  @UseGuards(JwtAuthGuard)
  async getJob(@Param('jobId') id: string, @Req() req: any) {
    const db = getDb();
    const [job] = await db.select().from(generationJobs).where(eq(generationJobs.id, id)).limit(1);
    if (!job || job.userId !== req.user.id) return { error: 'Not found' };
    return job;
  }
}
