import { Injectable, NotFoundException, BadRequestException, Inject, Optional, forwardRef } from '@nestjs/common';
import { getDb } from '@itchats/database';
import {
  posts, postReactions, postComments, postCommentReactions, characterFollows, characters,
  userFriends, users, reports, postLinkPreviews, userProfiles,
} from '@itchats/database/schema';
import { eq, and, sql, desc, inArray, isNull, or } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { NotificationsService, NOTIFICATION_TYPES } from '../notifications/notifications.service';
import { HashtagsService } from '../hashtags/hashtags.service';
import { LinkPreviewService } from './link-preview.service';

/**
 * Parse @handle mentions from post content.
 * Returns array of { handle } objects for each mention found.
 */
export function parseMentions(content: string): string[] {
  if (!content) return [];
  // Match @word patterns (word = alphanumeric + underscore)
  const regex = /@([\w]+)/g;
  const handles = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    handles.add(match[1]!);
  }
  return [...handles];
}

/**
 * Find character by handle (case-insensitive).
 * Falls back to name matching.
 */
export async function findCharacterByHandle(
  handle: string,
): Promise<{ id: string; name: string; ownerUserId: string | null } | null> {
  const db = getDb();
  const chars = await db
    .select({
      id: characters.id,
      name: characters.name,
      ownerUserId: characters.ownerUserId,
      handle: characters.handle,
    })
    .from(characters)
    .where(isNull(characters.deletedAt))
    .limit(200);

  const lowerHandle = handle.toLowerCase();
  // Try exact handle match first
  let found = chars.find(
    (c: any) => c.handle?.toLowerCase() === lowerHandle,
  );
  // Fallback to name match (underscore → space)
  if (!found) {
    const nameLike = lowerHandle.replace(/_/g, ' ');
    found = chars.find(
      (c: any) => c.name?.toLowerCase().replace(/\s+/g, '_') === lowerHandle ||
                 c.name?.toLowerCase() === nameLike,
    );
  }
  return found ?? null;
}

@Injectable()
export class PostsService {
  constructor(
    private readonly notifications: NotificationsService,
    @Inject(forwardRef(() => HashtagsService)) private readonly hashtags: HashtagsService,
    @Inject(forwardRef(() => LinkPreviewService)) private readonly linkPreview: LinkPreviewService,
  ) {}

  async createPost(
    userId: string,
    data: {
      content: string;
      mediaUrl?: string;
      mediaType?: string;
      visibility?: 'public' | 'friends' | 'private';
      nsfw?: boolean;
      repostOfPostId?: string;
      linkPreview?: {
        url: string;
        title?: string;
        description?: string;
        imageUrl?: string;
        siteName?: string;
      };
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
        repostOfPostId: data.repostOfPostId ?? null,
      })
      .returning();
    if (!post) throw new Error('Failed to create post');

    // Save link preview if provided
    if (data.linkPreview?.url) {
      this.linkPreview.savePostLinkPreview(post.id, {
        url: data.linkPreview.url,
        title: data.linkPreview.title,
        description: data.linkPreview.description,
        imageUrl: data.linkPreview.imageUrl,
        siteName: data.linkPreview.siteName,
      }).catch(() => {});
    }

    // Parse mentions and notify mentioned characters
    this.notifyMentions(post.id, data.content, userId).catch(() => {});
    // Parse hashtags and sync
    this.syncHashtags(post.id, data.content).catch(() => {});

    return post;
  }

  private async syncHashtags(postId: string, content: string) {
    const tags = HashtagsService.parseHashtags(content);
    if (tags.length > 0) {
      await this.hashtags.syncPostHashtags(postId, tags);
    }
  }

  /**
   * Parse mentions in post content and create notifications for mentioned characters.
   */
  private async notifyMentions(postId: string, content: string, authorUserId: string) {
    const handles = parseMentions(content);
    if (handles.length === 0) return;

    const [author] = await getDb()
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, authorUserId))
      .limit(1);

    const authorName = author?.username ?? 'Someone';

    for (const handle of handles) {
      const char = await findCharacterByHandle(handle);
      if (!char || !char.ownerUserId) continue;
      if (char.ownerUserId === authorUserId) continue; // Don't notify self

      try {
        await this.notifications.create({
          userId: char.ownerUserId,
          type: NOTIFICATION_TYPES.MENTION,
          title: `@${char.name} was mentioned`,
          body: `${authorName} mentioned @${char.name} in a post`,
          entityType: 'post',
          entityId: postId,
          actorCharacterId: char.id,
          data: { postId, characterId: char.id, type: 'mention' },
        });
      } catch {
        // Silent — notification failure shouldn't block post creation
      }
    }
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

    // Build feed: user's posts + followed characters + friends
    const conditions: any[] = [];
    conditions.push(eq(posts.authorUserId, userId));

    if (followedCharacterIds.length > 0) {
      conditions.push(inArray(posts.authorCharacterId, followedCharacterIds));
    }
    if (friendIds.length > 0) {
      conditions.push(inArray(posts.authorUserId, friendIds));
    }

    const feed = await db
      .select({
        id: posts.id,
        authorUserId: posts.authorUserId,
        authorCharacterId: posts.authorCharacterId,
        content: posts.content,
        mediaUrl: posts.mediaUrl,
        mediaType: posts.mediaType,
        thumbnailUrl: posts.thumbnailUrl,
        visibility: posts.visibility,
        repostOfPostId: posts.repostOfPostId,
        nsfw: posts.nsfw,
        likeCount: posts.likeCount,
        commentCount: posts.commentCount,
        shareCount: posts.shareCount,
        viewCount: posts.viewCount,
        isAiGenerated: posts.isAiGenerated,
        sourceNewsUrl: posts.sourceNewsUrl,
        sourceNewsTitle: posts.sourceNewsTitle,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        deletedAt: posts.deletedAt,
        authorName: sql<string>`COALESCE(${characters.name}, ${users.username}, 'Unknown')`,
        authorAvatar: characters.avatarUrl,
        authorIsAI: sql<boolean>`CASE WHEN ${posts.authorCharacterId} IS NOT NULL THEN true ELSE false END`,
      })
      .from(posts)
      .leftJoin(characters, eq(posts.authorCharacterId, characters.id))
      .leftJoin(users, eq(posts.authorUserId, users.id))
      .where(
        and(
          or(...conditions),
          isNull(posts.deletedAt),
        ),
      )
      .orderBy(desc(posts.createdAt))
      .limit(Math.min(limit, 50))
      .offset((page - 1) * limit);

    // Enrich with viewer's reaction to each post
    if (feed.length > 0) {
      const postIds = feed.map((p) => p.id);
      const allUserReactions = await db
        .select({
          postId: postReactions.postId,
          reactionType: postReactions.reactionType,
        })
        .from(postReactions)
        .where(eq(postReactions.userId, userId));

      const reactMap = new Map<string, string>();
      for (const r of allUserReactions) {
        reactMap.set(r.postId, r.reactionType);
      }

      return feed.map((p) => ({
        ...p,
        likeCount: Number.isFinite(Number(p.likeCount)) ? Number(p.likeCount) : 0,
        commentCount: Number.isFinite(Number(p.commentCount)) ? Number(p.commentCount) : 0,
        shareCount: Number.isFinite(Number(p.shareCount)) ? Number(p.shareCount) : 0,
        viewCount: Number.isFinite(Number(p.viewCount)) ? Number(p.viewCount) : 0,
        viewerReaction: reactMap.get(p.id) ?? null,
      }));
    }

    return feed.map((p) => ({
      ...p,
      likeCount: Number.isFinite(Number(p.likeCount)) ? Number(p.likeCount) : 0,
      commentCount: Number.isFinite(Number(p.commentCount)) ? Number(p.commentCount) : 0,
      shareCount: Number.isFinite(Number(p.shareCount)) ? Number(p.shareCount) : 0,
      viewCount: Number.isFinite(Number(p.viewCount)) ? Number(p.viewCount) : 0,
    }));
  }

  async getUserPosts(userId: string, targetUserId: string, page = 1, limit = 20) {
    const db = getDb();
    const results = await db
      .select({
        id: posts.id,
        authorUserId: posts.authorUserId,
        authorCharacterId: posts.authorCharacterId,
        content: posts.content,
        mediaUrl: posts.mediaUrl,
        mediaType: posts.mediaType,
        thumbnailUrl: posts.thumbnailUrl,
        visibility: posts.visibility,
        repostOfPostId: posts.repostOfPostId,
        nsfw: posts.nsfw,
        likeCount: posts.likeCount,
        commentCount: posts.commentCount,
        shareCount: posts.shareCount,
        viewCount: posts.viewCount,
        isAiGenerated: posts.isAiGenerated,
        sourceNewsUrl: posts.sourceNewsUrl,
        sourceNewsTitle: posts.sourceNewsTitle,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        deletedAt: posts.deletedAt,
        authorName: sql<string>`COALESCE(${characters.name}, ${users.username}, 'Unknown')`,
        authorAvatar: characters.avatarUrl,
        authorIsAI: sql<boolean>`CASE WHEN ${posts.authorCharacterId} IS NOT NULL THEN true ELSE false END`,
      })
      .from(posts)
      .leftJoin(characters, eq(posts.authorCharacterId, characters.id))
      .leftJoin(users, eq(posts.authorUserId, users.id))
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

    return results.map((p) => ({
      ...p,
      likeCount: Number.isFinite(Number(p.likeCount)) ? Number(p.likeCount) : 0,
      commentCount: Number.isFinite(Number(p.commentCount)) ? Number(p.commentCount) : 0,
      shareCount: Number.isFinite(Number(p.shareCount)) ? Number(p.shareCount) : 0,
      viewCount: Number.isFinite(Number(p.viewCount)) ? Number(p.viewCount) : 0,
    }));
  }

  async getCharacterPosts(characterId: string, page = 1, limit = 20) {
    const db = getDb();
    const results = await db
      .select({
        id: posts.id,
        authorUserId: posts.authorUserId,
        authorCharacterId: posts.authorCharacterId,
        content: posts.content,
        mediaUrl: posts.mediaUrl,
        mediaType: posts.mediaType,
        thumbnailUrl: posts.thumbnailUrl,
        visibility: posts.visibility,
        repostOfPostId: posts.repostOfPostId,
        nsfw: posts.nsfw,
        likeCount: posts.likeCount,
        commentCount: posts.commentCount,
        shareCount: posts.shareCount,
        viewCount: posts.viewCount,
        isAiGenerated: posts.isAiGenerated,
        sourceNewsUrl: posts.sourceNewsUrl,
        sourceNewsTitle: posts.sourceNewsTitle,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        deletedAt: posts.deletedAt,
        authorName: sql<string>`COALESCE(${characters.name}, ${users.username}, 'Unknown')`,
        authorAvatar: characters.avatarUrl,
        authorIsAI: sql<boolean>`CASE WHEN ${posts.authorCharacterId} IS NOT NULL THEN true ELSE false END`,
      })
      .from(posts)
      .leftJoin(characters, eq(posts.authorCharacterId, characters.id))
      .leftJoin(users, eq(posts.authorUserId, users.id))
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

    return results.map((p) => ({
      ...p,
      likeCount: Number.isFinite(Number(p.likeCount)) ? Number(p.likeCount) : 0,
      commentCount: Number.isFinite(Number(p.commentCount)) ? Number(p.commentCount) : 0,
      shareCount: Number.isFinite(Number(p.shareCount)) ? Number(p.shareCount) : 0,
      viewCount: Number.isFinite(Number(p.viewCount)) ? Number(p.viewCount) : 0,
    }));
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

  async updatePost(
    userId: string,
    postId: string,
    data: { content?: string; mediaUrl?: string; visibility?: 'public' | 'friends' | 'private' },
  ) {
    const db = getDb();
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    if (!post) throw new NotFoundException('Post not found');

    // Allow edit if user owns the post OR owns the character that authored it
    if (post.authorUserId !== userId) {
      if (post.authorCharacterId) {
        const [character] = await db
          .select()
          .from(characters)
          .where(eq(characters.id, post.authorCharacterId))
          .limit(1);
        if (!character || character.ownerUserId !== userId) {
          throw new BadRequestException('Not your post');
        }
      } else {
        throw new BadRequestException('Not your post');
      }
    }

    const updateData: any = { updatedAt: new Date() };
    if (data.content !== undefined) updateData.content = data.content;
    if (data.mediaUrl !== undefined) updateData.mediaUrl = data.mediaUrl;
    if (data.visibility !== undefined) updateData.visibility = data.visibility;

    const [updated] = await db
      .update(posts)
      .set(updateData)
      .where(eq(posts.id, postId))
      .returning();

    return updated;
  }

  async reportPost(userId: string, postId: string, reason: string) {
    const db = getDb();
    await db.insert(reports).values({
      reporterUserId: userId,
      entityType: 'post',
      entityId: postId,
      reason,
    } as any);
    return { reported: true, postId };
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
    const reactionCount = Number(r1?.count ?? 0);
    await db
      .update(posts)
      .set({ likeCount: reactionCount })
      .where(eq(posts.id, postId));

    // Get reaction breakdown
    const reactionRows = await db
      .select({
        type: postReactions.reactionType,
        count: sql<number>`count(*)`,
      })
      .from(postReactions)
      .where(eq(postReactions.postId, postId))
      .groupBy(postReactions.reactionType);

    const reactions = reactionRows.map((r) => ({
      type: r.type,
      count: Number.isFinite(Number(r.count)) ? Number(r.count) : 0,
    }));

    // Notify post author (if it's not the reactor themselves)
    if (post.authorUserId && post.authorUserId !== userId) {
      // Get reactor display name
      const [reactor] = await db.select({ username: users.username }).from(users).where(eq(users.id, userId)).limit(1);
      const reactorName = reactor?.username ?? 'Someone';

      this.notifications.create({
        userId: post.authorUserId,
        type: NOTIFICATION_TYPES.POST_REACTION,
        actorUserId: userId,
        entityType: 'post',
        entityId: postId,
        title: 'New reaction on your post',
        body: `${reactorName} reacted with ${reactionType} to your post`,
        data: { postId, reactionType },
      }).catch(() => {});
    }

    return {
      postId,
      viewerReaction: reactionType,
      reactionCount: Number.isFinite(reactionCount) ? reactionCount : 0,
      reactions,
    };
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
    const reactionCount = Number(r2?.count ?? 0);
    await db
      .update(posts)
      .set({ likeCount: reactionCount })
      .where(eq(posts.id, postId));

    // Get reaction breakdown
    const reactionRows = await db
      .select({
        type: postReactions.reactionType,
        count: sql<number>`count(*)`,
      })
      .from(postReactions)
      .where(eq(postReactions.postId, postId))
      .groupBy(postReactions.reactionType);

    const reactions = reactionRows.map((r) => ({
      type: r.type,
      count: Number.isFinite(Number(r.count)) ? Number(r.count) : 0,
    }));

    return {
      postId,
      viewerReaction: null,
      reactionCount: Number.isFinite(reactionCount) ? reactionCount : 0,
      reactions,
    };
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

    const result = await db
      .insert(postComments)
      .values({
        postId,
        userId,
        content,
        parentCommentId: parentCommentId ?? null,
      })
      .returning();

    const comment = result[0];
    if (!comment) throw new BadRequestException('Failed to create comment');

    // Parse mentions and notify
    this.notifyMentions(postId, content, userId).catch(() => {});

    // Notify post author about new comment (unless it's their own post)
    if (post.authorUserId && post.authorUserId !== userId) {
      const [commenter] = await db.select({ username: users.username }).from(users).where(eq(users.id, userId)).limit(1);
      const commenterName = commenter?.username ?? 'Someone';

      this.notifications.create({
        userId: post.authorUserId,
        type: NOTIFICATION_TYPES.COMMENT_REPLY,
        actorUserId: userId,
        entityType: parentCommentId ? 'comment' : 'post',
        entityId: parentCommentId || postId,
        title: parentCommentId ? 'New reply to a comment' : 'New comment on your post',
        body: `${commenterName} ${parentCommentId ? 'replied to a comment' : 'commented'} on your post`,
        data: { postId, commentId: comment.id, parentCommentId },
      }).catch(() => {});
    }

    // If replying to a specific parent comment, notify the parent comment's author
    if (parentCommentId) {
      const [parentComment] = await db
        .select({ userId: postComments.userId })
        .from(postComments)
        .where(eq(postComments.id, parentCommentId))
        .limit(1);

      if (parentComment?.userId && parentComment.userId !== userId && parentComment.userId !== post.authorUserId) {
        const [replier] = await db.select({ username: users.username }).from(users).where(eq(users.id, userId)).limit(1);
        const replierName = replier?.username ?? 'Someone';

        this.notifications.create({
          userId: parentComment.userId,
          type: NOTIFICATION_TYPES.COMMENT_REPLY,
          actorUserId: userId,
          entityType: 'comment',
          entityId: parentCommentId,
          title: 'Someone replied to your comment',
          body: `${replierName} replied to your comment`,
          data: { postId, commentId: comment.id, parentCommentId },
        }).catch(() => {});
      }
    }

    // Update comment count
    const [r3] = await db
      .select({ count: sql<number>`count(*)` })
      .from(postComments)
      .where(and(eq(postComments.postId, postId), isNull(postComments.deletedAt)));
    await db
      .update(posts)
      .set({ commentCount: Number.isFinite(Number(r3?.count ?? 0)) ? Number(r3?.count) : 0 })
      .where(eq(posts.id, postId));

    // Get author info to return a rich comment shape
    const [author] = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return {
      id: comment.id,
      postId: comment.postId,
      authorName: author?.username ?? 'User',
      authorAvatar: '',
      authorIsAI: false,
      content: comment.content,
      createdAt: comment.createdAt?.toISOString() ?? new Date().toISOString(),
      likes: 0,
      liked: false,
      replies: [],
    };
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
      .set({ commentCount: Number.isFinite(Number(r4?.count ?? 0)) ? Number(r4?.count) : 0 })
      .where(eq(posts.id, comment.postId));

    return { deleted: true, id: commentId };
  }

  async getPostComments(postId: string, page = 1, limit = 20) {
    const db = getDb();

    // Get top-level comments including AI-to-AI ones
    const comments = await db
      .select({
        id: postComments.id,
        postId: postComments.postId,
        userId: postComments.userId,
        characterId: postComments.characterId,
        parentCommentId: postComments.parentCommentId,
        content: postComments.content,
        isAiGenerated: postComments.isAiGenerated,
        likeCount: postComments.likeCount,
        createdAt: postComments.createdAt,
        updatedAt: postComments.updatedAt,
        deletedAt: postComments.deletedAt,
        authorName: sql<string>`COALESCE(${characters.name}, ${users.username}, 'Unknown')`,
        authorAvatar: characters.avatarUrl,
        authorIsAI: sql<boolean>`CASE WHEN ${postComments.characterId} IS NOT NULL THEN true ELSE false END`,
      })
      .from(postComments)
      .leftJoin(users, eq(postComments.userId, users.id))
      .leftJoin(characters, eq(postComments.characterId, characters.id))
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

    // For each top-level comment, get replies (including AI-to-AI)
    const result = await Promise.all(
      comments.map(async (comment) => {
        const replies = await db
          .select({
            id: postComments.id,
            postId: postComments.postId,
            userId: postComments.userId,
            characterId: postComments.characterId,
            parentCommentId: postComments.parentCommentId,
            content: postComments.content,
            isAiGenerated: postComments.isAiGenerated,
            likeCount: postComments.likeCount,
            createdAt: postComments.createdAt,
            authorName: sql<string>`COALESCE(${characters.name}, ${users.username}, 'Unknown')`,
            authorAvatar: characters.avatarUrl,
            authorIsAI: sql<boolean>`CASE WHEN ${postComments.characterId} IS NOT NULL THEN true ELSE false END`,
          })
          .from(postComments)
          .leftJoin(users, eq(postComments.userId, users.id))
          .leftJoin(characters, eq(postComments.characterId, characters.id))
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

  async addCommentReaction(userId: string, commentId: string, reactionType: string) {
    const db = getDb();

    const [comment] = await db
      .select()
      .from(postComments)
      .where(and(eq(postComments.id, commentId), isNull(postComments.deletedAt)))
      .limit(1);
    if (!comment) throw new NotFoundException('Comment not found');

    const validTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'care'];
    if (!validTypes.includes(reactionType)) {
      throw new BadRequestException(`Invalid reaction type. Valid: ${validTypes.join(', ')}`);
    }

    // Upsert reaction
    await db
      .insert(postCommentReactions)
      .values({
        commentId,
        userId,
        reactionType: reactionType as any,
      })
      .onConflictDoUpdate({
        target: [postCommentReactions.commentId, postCommentReactions.userId],
        set: { reactionType: reactionType as any },
      });

    // Update comment like count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(postCommentReactions)
      .where(eq(postCommentReactions.commentId, commentId));
    const reactionCount = Number(countResult?.count ?? 0);
    await db
      .update(postComments)
      .set({ likeCount: reactionCount, updatedAt: new Date() })
      .where(eq(postComments.id, commentId));

    // Get reaction breakdown
    const reactionRows = await db
      .select({
        type: postCommentReactions.reactionType,
        count: sql<number>`count(*)`,
      })
      .from(postCommentReactions)
      .where(eq(postCommentReactions.commentId, commentId))
      .groupBy(postCommentReactions.reactionType);

    const reactions = reactionRows.map((r) => ({
      type: r.type,
      count: Number.isFinite(Number(r.count)) ? Number(r.count) : 0,
    }));

    // Notify comment author about reaction (unless it's themselves)
    if (comment.userId && comment.userId !== userId) {
      const [reactor] = await db.select({ username: users.username }).from(users).where(eq(users.id, userId)).limit(1);
      const reactorName = reactor?.username ?? 'Someone';

      this.notifications.create({
        userId: comment.userId,
        type: NOTIFICATION_TYPES.COMMENT_REACTION,
        actorUserId: userId,
        entityType: 'comment',
        entityId: commentId,
        title: 'New reaction on your comment',
        body: `${reactorName} reacted with ${reactionType} to your comment`,
        data: { commentId, postId: comment.postId, reactionType },
      }).catch(() => {});
    }

    return {
      commentId,
      viewerReaction: reactionType,
      reactionCount: Number.isFinite(reactionCount) ? reactionCount : 0,
      reactions,
    };
  }

  async removeCommentReaction(userId: string, commentId: string) {
    const db = getDb();

    await db
      .delete(postCommentReactions)
      .where(
        and(
          eq(postCommentReactions.commentId, commentId),
          eq(postCommentReactions.userId, userId),
        ),
      );

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(postCommentReactions)
      .where(eq(postCommentReactions.commentId, commentId));
    const reactionCount = Number(countResult?.count ?? 0);
    await db
      .update(postComments)
      .set({ likeCount: reactionCount, updatedAt: new Date() })
      .where(eq(postComments.id, commentId));

    // Get reaction breakdown
    const reactionRows = await db
      .select({
        type: postCommentReactions.reactionType,
        count: sql<number>`count(*)`,
      })
      .from(postCommentReactions)
      .where(eq(postCommentReactions.commentId, commentId))
      .groupBy(postCommentReactions.reactionType);

    const reactions = reactionRows.map((r) => ({
      type: r.type,
      count: Number.isFinite(Number(r.count)) ? Number(r.count) : 0,
    }));

    return {
      commentId,
      viewerReaction: null,
      reactionCount: Number.isFinite(reactionCount) ? reactionCount : 0,
      reactions,
    };
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
      counts[r.reactionType] = Number.isFinite(Number(r.count)) ? Number(r.count) : 0;
    }

    return { postId, reactions: counts };
  }

  async getUserPhotos(userId: string) {
    const db = getDb();
    const results = await db
      .select({
        id: posts.id,
        url: posts.mediaUrl,
        mediaType: posts.mediaType,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .where(
        and(
          eq(posts.authorUserId, userId),
          isNull(posts.deletedAt),
          sql`${posts.mediaUrl} IS NOT NULL`,
        ),
      )
      .orderBy(desc(posts.createdAt))
      .limit(30);

    return results.filter(r => r.url).map(r => ({ id: r.id, url: r.url! }));
  }
}
