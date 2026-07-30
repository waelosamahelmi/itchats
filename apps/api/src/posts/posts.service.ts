import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { getDb } from '@itchats/database';
import {
  posts, postReactions, postComments, characterFollows, characters,
  userFriends,
} from '@itchats/database/schema';
import { eq, and, sql, desc, inArray, isNull, or } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

@Injectable()
export class PostsService {
  async createPost(
    userId: string,
    data: {
      content: string;
      mediaUrl?: string;
      mediaType?: string;
      visibility?: 'public' | 'friends' | 'private';
      nsfw?: boolean;
    },
  ) {
    const db = getDb();
    const [post] = await db
      .insert(posts)
      .values({
        authorUserId: userId,
        content: data.content,
        mediaUrl: data.mediaUrl ?? null,
        mediaType: data.mediaType ?? null,
        visibility: data.visibility ?? 'public',
        nsfw: data.nsfw ?? false,
      })
      .returning();
    if (!post) throw new Error('Failed to create post');
    return post;
  }

  async getFeed(userId: string, page = 1, limit = 20) {
    const db = getDb();

    // Get IDs of characters the user follows
    const follows = await db
      .select({ characterId: characterFollows.characterId })
      .from(characterFollows)
      .where(eq(characterFollows.userId, userId));

    const followedCharacterIds = follows.map((f) => f.characterId);

    // Get IDs of accepted friends
    const friendRows = await db
      .select({ friendId: userFriends.friendId })
      .from(userFriends)
      .where(
        and(
          eq(userFriends.userId, userId),
          eq(userFriends.status, 'accepted'),
        ),
      );
    const friendIds = friendRows.map((f) => f.friendId);

    // Build feed: user's own posts + posts from followed characters + posts from friends
    const conditions: any[] = [];
    conditions.push(eq(posts.authorUserId, userId));

    if (followedCharacterIds.length > 0) {
      conditions.push(inArray(posts.authorCharacterId, followedCharacterIds));
    }
    if (friendIds.length > 0) {
      conditions.push(inArray(posts.authorUserId, friendIds));
    }

    const feed = await db
      .select()
      .from(posts)
      .where(
        and(
          or(...conditions),
          isNull(posts.deletedAt),
        ),
      )
      .orderBy(desc(posts.createdAt))
      .limit(Math.min(limit, 50))
      .offset((page - 1) * limit);

    return feed;
  }

  async getUserPosts(userId: string, targetUserId: string, page = 1, limit = 20) {
    const db = getDb();
    return db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.authorUserId, targetUserId),
          isNull(posts.deletedAt),
          sql`${posts.visibility} != 'private' OR ${posts.authorUserId} = ${userId}`,
        ),
      )
      .orderBy(desc(posts.createdAt))
      .limit(Math.min(limit, 50))
      .offset((page - 1) * limit);
  }

  async getCharacterPosts(characterId: string, page = 1, limit = 20) {
    const db = getDb();
    return db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.authorCharacterId, characterId),
          isNull(posts.deletedAt),
          eq(posts.visibility, 'public'),
        ),
      )
      .orderBy(desc(posts.createdAt))
      .limit(Math.min(limit, 50))
      .offset((page - 1) * limit);
  }

  async deletePost(userId: string, postId: string) {
    const db = getDb();
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorUserId !== userId) throw new BadRequestException('Not your post');

    await db
      .update(posts)
      .set({ deletedAt: new Date() })
      .where(eq(posts.id, postId));

    return { deleted: true, id: postId };
  }

  async likePost(userId: string, postId: string, reactionType: string) {
    const db = getDb();

    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!post) throw new NotFoundException('Post not found');

    const validTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'care'];
    if (!validTypes.includes(reactionType)) {
      throw new BadRequestException(`Invalid reaction type. Valid: ${validTypes.join(', ')}`);
    }

    // Upsert reaction
    await db
      .insert(postReactions)
      .values({
        postId,
        userId,
        reactionType: reactionType as any,
      })
      .onConflictDoUpdate({
        target: [postReactions.postId, postReactions.userId],
        set: { reactionType: reactionType as any },
      });

    // Update like count
    const [r1] = await db
      .select({ count: sql<number>`count(*)` })
      .from(postReactions)
      .where(eq(postReactions.postId, postId));
    await db
      .update(posts)
      .set({ likeCount: Number(r1?.count ?? 0) })
      .where(eq(posts.id, postId));

    return { reacted: true, postId, reactionType };
  }

  async unlikePost(userId: string, postId: string) {
    const db = getDb();

    await db
      .delete(postReactions)
      .where(
        and(
          eq(postReactions.postId, postId),
          eq(postReactions.userId, userId),
        ),
      );

    const [r2] = await db
      .select({ count: sql<number>`count(*)` })
      .from(postReactions)
      .where(eq(postReactions.postId, postId));
    await db
      .update(posts)
      .set({ likeCount: Number(r2?.count ?? 0) })
      .where(eq(posts.id, postId));

    return { unreacted: true, postId };
  }

  async addComment(
    userId: string,
    postId: string,
    content: string,
    parentCommentId?: string,
  ) {
    const db = getDb();

    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!post) throw new NotFoundException('Post not found');

    if (parentCommentId) {
      const [parent] = await db
        .select()
        .from(postComments)
        .where(eq(postComments.id, parentCommentId))
        .limit(1);
      if (!parent || parent.postId !== postId) {
        throw new BadRequestException('Parent comment not found on this post');
      }
    }

    const [comment] = await db
      .insert(postComments)
      .values({
        postId,
        userId,
        content,
        parentCommentId: parentCommentId ?? null,
      })
      .returning();

    // Update comment count
    const [r3] = await db
      .select({ count: sql<number>`count(*)` })
      .from(postComments)
      .where(and(eq(postComments.postId, postId), isNull(postComments.deletedAt)));
    await db
      .update(posts)
      .set({ commentCount: Number(r3?.count ?? 0) })
      .where(eq(posts.id, postId));

    return comment;
  }

  async deleteComment(userId: string, commentId: string) {
    const db = getDb();
    const [comment] = await db
      .select()
      .from(postComments)
      .where(eq(postComments.id, commentId))
      .limit(1);
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) throw new BadRequestException('Not your comment');

    await db
      .update(postComments)
      .set({ deletedAt: new Date() })
      .where(eq(postComments.id, commentId));

    // Update comment count
    const [r4] = await db
      .select({ count: sql<number>`count(*)` })
      .from(postComments)
      .where(and(eq(postComments.postId, comment.postId), isNull(postComments.deletedAt)));
    await db
      .update(posts)
      .set({ commentCount: Number(r4?.count ?? 0) })
      .where(eq(posts.id, comment.postId));

    return { deleted: true, id: commentId };
  }

  async getPostComments(postId: string, page = 1, limit = 20) {
    const db = getDb();

    // Get top-level comments
    const comments = await db
      .select()
      .from(postComments)
      .where(
        and(
          eq(postComments.postId, postId),
          isNull(postComments.deletedAt),
          isNull(postComments.parentCommentId),
        ),
      )
      .orderBy(sql`${postComments.createdAt} ASC`)
      .limit(Math.min(limit, 50))
      .offset((page - 1) * limit);

    // For each top-level comment, get replies
    const result = await Promise.all(
      comments.map(async (comment) => {
        const replies = await db
          .select()
          .from(postComments)
          .where(
            and(
              eq(postComments.postId, postId),
              eq(postComments.parentCommentId, comment.id),
              isNull(postComments.deletedAt),
            ),
          )
          .orderBy(sql`${postComments.createdAt} ASC`);

        return { ...comment, replies };
      }),
    );

    return result;
  }

  async getPostReactions(postId: string) {
    const db = getDb();

    const reactions = await db
      .select({
        reactionType: postReactions.reactionType,
        count: sql<number>`count(*)`,
      })
      .from(postReactions)
      .where(eq(postReactions.postId, postId))
      .groupBy(postReactions.reactionType);

    const counts: Record<string, number> = {};
    for (const r of reactions) {
      counts[r.reactionType] = Number(r.count);
    }

    return { postId, reactions: counts };
  }
}
