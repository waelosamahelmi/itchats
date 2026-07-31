import { Injectable } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { hashtags, postHashtags, posts, users, characters } from '@itchats/database/schema';
import { eq, desc, sql, and, inArray, ilike } from 'drizzle-orm';

@Injectable()
export class HashtagsService {
  /**
   * Parse hashtags from text (supports Unicode word characters)
   */
  static parseHashtags(text: string): string[] {
    const matches = text.match(/#([\p{L}\p{N}_]+)/gu);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
  }

  /**
   * Normalize a hashtag name for storage
   */
  static normalize(name: string): string {
    return name.toLowerCase().trim();
  }

  /**
   * Upsert hashtags and link them to a post. Call within a transaction.
   */
  async syncPostHashtags(postId: string, tags: string[]) {
    const db = getDb();
    const normalized = [...new Set(tags.map(HashtagsService.normalize).filter(Boolean))];

    // Delete existing links for this post
    await db.delete(postHashtags).where(eq(postHashtags.postId, postId));

    for (const name of normalized) {
      // Upsert hashtag
      const existing = await db.select({ id: hashtags.id })
        .from(hashtags)
        .where(eq(hashtags.normalizedName, name))
        .limit(1);

      let tagId: string;
      if (existing.length > 0) {
        tagId = existing[0]!.id;
        // Increment usage count
        await db.update(hashtags)
          .set({ usageCount: sql`${hashtags.usageCount} + 1` })
          .where(eq(hashtags.id, tagId));
      } else {
        const [created] = await db.insert(hashtags)
          .values({ normalizedName: name, displayName: `#${name}`, usageCount: 1 })
          .returning({ id: hashtags.id });
        tagId = created!.id;
      }

      // Link post to hashtag
      await db.insert(postHashtags)
        .values({ postId, hashtagId: tagId })
        .onConflictDoNothing();
    }
  }

  /**
   * Get posts for a specific hashtag
   */
  async getPostsByHashtag(name: string, page = 1, limit = 20) {
    const db = getDb();
    const normalized = HashtagsService.normalize(name);

    const tag = await db.select({ id: hashtags.id })
      .from(hashtags)
      .where(eq(hashtags.normalizedName, normalized))
      .limit(1);

    if (tag.length === 0) return { posts: [], hashtag: name, page, hasMore: false };
    const tagId = tag[0]!.id;

    const offset = (page - 1) * limit;
    const results = await db.select({
      id: posts.id,
      content: posts.content,
      mediaUrl: posts.mediaUrl,
      mediaType: posts.mediaType,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      shareCount: posts.shareCount,
      createdAt: posts.createdAt,
      authorUserId: posts.authorUserId,
      authorCharacterId: posts.authorCharacterId,
      authorUsername: users.username,
      authorCharacterName: characters.name,
      authorAvatarUrl: characters.avatarUrl,
    })
    .from(postHashtags)
    .innerJoin(posts, eq(postHashtags.postId, posts.id))
    .leftJoin(users, eq(posts.authorUserId, users.id))
    .leftJoin(characters, eq(posts.authorCharacterId, characters.id))
    .where(and(
      eq(postHashtags.hashtagId, tagId),
      sql`${posts.deletedAt} IS NULL`,
    ))
    .orderBy(desc(posts.createdAt))
    .limit(limit + 1)
    .offset(offset);

    const hasMore = results.length > limit;
    const postResults = results.slice(0, limit).map(r => ({
      ...r,
      authorName: r.authorUsername || r.authorCharacterName || 'Unknown',
      authorAvatar: r.authorAvatarUrl || null,
      isAI: !!r.authorCharacterId,
    }));

    return { posts: postResults, hashtag: name, page, hasMore };
  }

  /**
   * Get trending hashtags
   */
  async getTrending(limit = 20) {
    const db = getDb();
    return db.select({
      id: hashtags.id,
      name: hashtags.normalizedName,
      displayName: hashtags.displayName,
      usageCount: hashtags.usageCount,
    })
    .from(hashtags)
    .orderBy(desc(hashtags.usageCount))
    .limit(limit);
  }
}
