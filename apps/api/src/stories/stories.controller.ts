import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { stories } from '@itchats/database/schema';
import { eq, and } from 'drizzle-orm';

@Controller('v1/stories')
export class StoriesController {
  @Get('feed')
  async getFeed() {
    const db = getDb();
    return db.select().from(stories)
      .where(and(eq(stories.status, 'published'), eq(stories.generated, 'false')))
      .limit(50);
  }

  @Get('following')
  async getFollowing() {
    return { stories: [] };
  }

  @Post()
  async create(@Body() body: { storyType: string; caption?: string; mediaAssetId?: string }) {
    const db = getDb();
    const [story] = await db.insert(stories).values({
      authorUserId: '00000000-0000-0000-0000-000000000001',
      status: 'draft',
      storyType: body.storyType,
      caption: body.caption,
      mediaAssetId: body.mediaAssetId,
    }).returning();
    return story;
  }

  @Delete(':storyId')
  async delete(@Param('storyId') id: string) {
    const db = getDb();
    await db.update(stories).set({ status: 'removed' }).where(eq(stories.id, id));
    return { deleted: true };
  }
}
