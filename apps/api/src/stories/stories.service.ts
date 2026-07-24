import { Injectable } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { stories, storyViews, contentLikes } from '@itchats/database/schema';
import { eq, and, desc, count } from 'drizzle-orm';

@Injectable()
export class StoriesService {
  async getFeed() {
    const db = getDb();
    return db.select().from(stories)
      .where(eq(stories.status, 'published'))
      .orderBy(desc(stories.publishedAt))
      .limit(50);
  }

  async getFollowing(userId: string) {
    return { stories: [] };
  }

  async getCharacterStories(characterId: string) {
    const db = getDb();
    return db.select().from(stories)
      .where(and(eq(stories.authorCharacterId, characterId), eq(stories.status, 'published')))
      .orderBy(desc(stories.publishedAt))
      .limit(20);
  }

  async createStory(userId: string, data: { storyType: string; caption?: string; mediaAssetId?: string }) {
    const db = getDb();
    const [story] = await db.insert(stories).values({
      authorUserId: userId,
      status: 'draft',
      storyType: data.storyType,
      caption: data.caption,
      mediaAssetId: data.mediaAssetId,
    }).returning();
    return story;
  }

  async deleteStory(userId: string, storyId: string) {
    const db = getDb();
    await db.update(stories).set({ status: 'removed' })
      .where(and(eq(stories.id, storyId), eq(stories.authorUserId, userId)));
    return { deleted: true };
  }

  async viewStory(userId: string, storyId: string) {
    const db = getDb();
    await db.insert(storyViews).values({ storyId, viewerUserId: userId }).onConflictDoNothing();
    return { viewed: true };
  }

  async likeStory(userId: string, storyId: string) {
    const db = getDb();
    await db.insert(contentLikes).values({
      userId, entityType: 'story', entityId: storyId,
    }).onConflictDoNothing();
    return { liked: true };
  }

  async unlikeStory(userId: string, storyId: string) {
    const db = getDb();
    await db.delete(contentLikes)
      .where(and(eq(contentLikes.userId, userId), eq(contentLikes.entityType, 'story'), eq(contentLikes.entityId, storyId)));
    return { unliked: true };
  }
}
