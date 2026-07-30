import { Injectable, Logger } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { stories, storyViews, contentLikes, characterFollows, users, characters } from '@itchats/database/schema';
import { eq, and, desc, count, inArray, isNull, or, sql } from 'drizzle-orm';

@Injectable()
export class StoriesService {
  private readonly logger = new Logger(StoriesService.name);
  /**
   * GET /v1/stories — returns ONE story per character that has active stories.
   * Groups stories by character, returns the latest active story per character.
   * Characters without published/active stories are excluded.
   */
  async getAllStories() {
    const db = getDb();
    const now = new Date();

    // Get all active, published, non-expired stories
    const allActive = await db.select({
      id: stories.id,
      authorUserId: stories.authorUserId,
      authorCharacterId: stories.authorCharacterId,
      characterId: stories.characterId,
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
      authorAvatarUrl: characters.avatarUrl,
      authorHandle: characters.handle,
    }).from(stories)
      .leftJoin(users, eq(stories.authorUserId, users.id))
      .leftJoin(characters, eq(stories.authorCharacterId, characters.id))
      .where(and(
        eq(stories.status, 'published'),
        or(isNull(stories.expiresAt), sql`${stories.expiresAt} > ${now}`),
      ))
      .orderBy(desc(stories.publishedAt));

    // Group by character - one story ring per character (their latest)
    const grouped = new Map<string, typeof allActive[0]>();
    for (const story of allActive) {
      const key = story.authorCharacterId || story.authorUserId || 'unknown';
      if (!grouped.has(key)) {
        grouped.set(key, story);
      }
    }

    // Convert to array with derived fields
    const result = Array.from(grouped.values()).map(r => ({
      ...r,
      authorName: r.authorUsername || r.authorCharacterName || 'Unknown',
      authorAvatar: r.authorAvatarUrl || null,
      isAI: !!r.authorCharacterId,
      isLive: false,
      viewed: false,
    })).slice(0, 50);

    return result;
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
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 3600000);
    const [story] = await db.insert(stories).values({
      authorUserId: userId,
      creatorId: userId,
      status: 'published',
      storyType: data.storyType,
      caption: data.caption,
      mediaUrl: data.mediaUrl,
      publishedAt: now,
      expiresAt,
    } as any).returning();

    // Schedule AI character reactions to this user story
    if (story) {
      this.scheduleStoryReactions(story.id, userId);
    }

    return story;
  }

  /**
   * Schedule AI characters to view/react to user's story.
   * Called after a user publishes a story.
   */
  private scheduleStoryReactions(storyId: string, userId: string) {
    this.logger.log(`Scheduling story reactions for story ${storyId}`);

    // Get all active characters and randomly decide which react
    getDb().select().from(characters)
      .where(and(
        eq(characters.status, 'published'),
        sql`${characters.deletedAt} IS NULL`,
      ))
      .then(allCharacters => {
        const reactors = allCharacters
          .filter(() => Math.random() < 0.4) // 40% chance each character reacts
          .slice(0, 5); // Max 5 reactors

        for (const char of reactors) {
          const delayMs = (5 + Math.floor(Math.random() * 55)) * 60 * 1000; // 5-60 min delay
          setTimeout(async () => {
            try {
              const db = getDb();
              // Record a story view
              await db.insert(storyViews).values({
                storyId,
                viewerUserId: userId,
              }).onConflictDoNothing();

              // Add a story like (50% chance)
              if (Math.random() < 0.5) {
                await db.insert(contentLikes).values({
                  userId,
                  entityType: 'story',
                  entityId: storyId,
                }).onConflictDoNothing();
              }

              console.log(`Character ${char.name} reacted to story ${storyId}`);
            } catch (err: any) {
              console.error(`Story reaction failed for ${char.name}: ${err.message}`);
            }
          }, delayMs);
        }
      })
      .catch(err => console.error(`Failed to schedule story reactions: ${err.message}`));
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
