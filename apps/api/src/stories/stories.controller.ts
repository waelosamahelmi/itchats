import { Controller, Get, Post, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { stories } from '@itchats/database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('v1/stories')
export class StoriesController {
  @Get('feed')
  @UseGuards(JwtAuthGuard)
  async getFeed() {
    const db = getDb();
    return db.select().from(stories)
      .where(eq(stories.status, 'published'))
      .orderBy(desc(stories.publishedAt))
      .limit(50);
  }

  @Get('following')
  @UseGuards(JwtAuthGuard)
  async getFollowing(@Req() req: any) {
    return { stories: [] };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: { storyType: string; caption?: string; mediaAssetId?: string }, @Req() req: any) {
    const db = getDb();
    const [story] = await db.insert(stories).values({
      authorUserId: req.user.id,
      status: 'draft',
      storyType: body.storyType,
      caption: body.caption,
      mediaAssetId: body.mediaAssetId,
    }).returning();
    return story;
  }

  @Delete(':storyId')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('storyId') id: string, @Req() req: any) {
    const db = getDb();
    await db.update(stories).set({ status: 'removed' }).where(and(eq(stories.id, id), eq(stories.authorUserId, req.user.id)));
    return { deleted: true };
  }
}
