import { Injectable } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { stories, storyViews, contentLikes, characterFollows, users, characters } from '@itchats/database/schema';
import { eq, and, desc, count, inArray, isNull, or, sql } from 'drizzle-orm';

@Injectable()
export class StoriesService {
  /** GET /v1/stories — all published, active (non-expired) stories with author info */
  async getAllStories() {
    const db = getDb();
    const now = new Date();
    const results = await db.select({
      id: stories.id,
      authorUserId: stories.authorUserId,
      authorCharacterId: stories.authorCharacterId,
      status: stories.status,
      caption: stories.caption,
      storyType: stories.storyType,
      mediaUrl: stories.mediaUrl,
      mediaType: stories.mediaType,
      thumbnailUrl: stories.thumbnailUrl,
      duration: stories.duration,
      viewCount: stories.viewCount,
      likeCount: stories.likeCount,
      publishedAt: stories.publishedAt,
      expiresAt: stories.expiresAt,
      createdAt: stories.createdAt,
      authorUsername: users.username,
      authorCharacterName: characters.name,
    }).from(stories)
      .leftJoin(users, eq(stories.authorUserId, users.id))
      .leftJoin(characters, eq(stories.authorCharacterId, characters.id))
      .where(and(
        eq(stories.status, 'published'),
        or(isNull(stories.expiresAt), sql`${stories.expiresAt} > ${now}`),
      ))
      .orderBy(desc(stories.publishedAt))
      .limit(50);

    return results.map(r => ({
      ...r,
      authorName: r.authorUsername || r.authorCharacterName || 'Unknown',
      authorAvatar: null,
    }));
  }

  async getFeed() {
    const db = getDb();
    return db.select().from(stories)
      .where(eq(stories.status, 'published'))
      .orderBy(desc(stories.publishedAt))
      .limit(50);
  }

  async getFollowing(userId: string) {
    const db = getDb();
    const follows = await db.select({ characterId: characterFollows.characterId })
      .from(characterFollows).where(eq(characterFollows.userId, userId));
    if (follows.length === 0) return { stories: [] };
    const characterIds = follows.map(f => f.characterId);
    const results = await db.select().from(stories)
      .where(and(eq(stories.status, 'published'), inArray(stories.authorCharacterId!, characterIds)))
      .orderBy(desc(stories.publishedAt)).limit(50);
    return { stories: results };
  }

  async getCharacterStories(characterId: string) {
    const db = getDb();
    return db.select().from(stories)
      .where(and(eq(stories.authorCharacterId, characterId), eq(stories.status, 'published')))
      .orderBy(desc(stories.publishedAt))
      .limit(20);
  }

  async createStory(userId: string, data: { storyType: string; caption?: string; mediaUrl?: string }) {
    const db = getDb();
    const [story] = await db.insert(stories).values({
      authorUserId: userId,
      creatorId: userId,
      status: 'draft',
      storyType: data.storyType,
      caption: data.caption,
      mediaUrl: data.mediaUrl,
    } as any).returning();
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
