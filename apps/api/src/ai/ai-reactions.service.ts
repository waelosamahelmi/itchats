import { Injectable, Logger } from '@nestjs/common';
import { getDb } from '@itchats/database';
import {
  posts,
  postReactions,
  postComments,
  characterFollows,
  characters,
  characterRelationships,
  users,
} from '@itchats/database/schema';
import { eq, and, sql, isNull, or, inArray } from 'drizzle-orm';
import { alibabaChat } from '@itchats/ai-core';
import { parseMentions, findCharacterByHandle } from '../posts/posts.service';
import { Queue } from 'bullmq';
import { getConfig } from '@itchats/config';

/**
 * Get a BullMQ Queue instance connected to Redis.
 * Queue names match those defined in the worker package.
 */
function getQueue(name: string): Queue {
  const config = getConfig();
  return new Queue(name, { connection: { url: config.REDIS_URL } });
}

interface ReactionDecision {
  shouldReact: boolean;
  reactionType?: string;
  comment?: string;
  reason?: string;
}

/**
 * Get the BullMQ queues for AI social operations.
 */
function getSocialQueues(): {
  aiPostReactions: Queue;
  characterReply: Queue;
  aiSocialInteraction: Queue;
} {
  return {
    aiPostReactions: getQueue('ai-post-reactions'),
    characterReply: getQueue('character-reply'),
    aiSocialInteraction: getQueue('ai-social-interaction'),
  };
}

@Injectable()
export class AiReactionsService {
  private readonly logger = new Logger(AiReactionsService.name);
  private readonly reactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'care'];

  /**
   * Called after a user creates a post. Enqueues AI character reactions
   * as durable BullMQ jobs with staggered delays.
   */
  async scheduleReactions(postId: string, userId?: string) {
    const db = getDb();

    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    if (!post) return;

    const authorUserId = post.authorUserId || userId;
    if (!authorUserId) return;

    // Get characters the user follows
    const follows = await db
      .select({ characterId: characterFollows.characterId })
      .from(characterFollows)
      .where(eq(characterFollows.userId, authorUserId));

    const followedCharIds = follows.map((f) => f.characterId);
    if (followedCharIds.length === 0) return;

    // Get those characters
    const followedChars = await db
      .select()
      .from(characters)
      .where(
        and(
          inArray(characters.id, followedCharIds),
          eq(characters.status, 'published'),
          sql`${characters.deletedAt} IS NULL`,
        ),
      );

    if (followedChars.length === 0) return;

    try {
      const { aiPostReactions: queue } = getSocialQueues();

      // Enqueue all characters into a single AI post reaction job
      // The worker processes the job for each character with proper rate limits
      for (const character of followedChars) {
        // Check relationship level
        const [rel] = await db
          .select()
          .from(characterRelationships)
          .where(
            and(
              eq(characterRelationships.characterId, character.id),
              eq(characterRelationships.userId, authorUserId),
            ),
          )
          .limit(1);

        const relationshipLevel = rel ? Number(rel.visibleLevel) || 0 : 0;
        if (relationshipLevel < 2) continue; // Skip strangers

        // Random delay 1-30 minutes for natural timing
        const delayMinutes = 1 + Math.floor(Math.random() * 30);
        const delayMs = delayMinutes * 60 * 1000;

        this.logger.log(
          `Enqueuing reaction job from ${character.name} to post ${postId} (delay: ${delayMinutes}min)`,
        );

        await queue.add(
          `ai-reaction-${postId}-${character.id}`,
          { postId, characterId: character.id },
          { delay: delayMs, removeOnComplete: { age: 3600 }, removeOnFail: { age: 86400 } },
        );
      }
    } catch (err: any) {
      this.logger.warn(`BullMQ queue unavailable, falling back to inline processing: ${err.message}`);
      // Fallback: process inline if Redis isn't available
      for (const character of followedChars) {
        const delayMinutes = 1 + Math.floor(Math.random() * 30);
        const delayMs = delayMinutes * 60 * 1000;
        setTimeout(() => {
          this.processCharacterReaction(postId, character.id).catch((e) =>
            this.logger.error(`Fallback reaction failed: ${e.message}`),
          );
        }, delayMs);
      }
    }

    // Schedule AI-to-AI interactions too
    this.scheduleAiToAiInteractions(postId, post).catch(() => {});
    // Schedule mention replies
    this.scheduleMentionReplies(postId, post.content ?? '').catch(() => {});
  }

  /**
   * Schedule AI-to-AI interactions: characters react to each other's posts.
   */
  private async scheduleAiToAiInteractions(postId: string, post: any) {
    if (!post.authorCharacterId) return; // Only for character-authored posts

    const db = getDb();
    // Get all public characters (excluding the author)
    const allChars = await db
      .select()
      .from(characters)
      .where(
        and(
          eq(characters.status, 'published'),
          eq(characters.visibility, 'public'),
          sql`${characters.deletedAt} IS NULL`,
          sql`${characters.id} != ${post.authorCharacterId}`,
        ),
      )
      .limit(20);

    try {
      const { aiSocialInteraction: queue } = getSocialQueues();

      for (const character of allChars) {
        // 15% chance to interact
        if (Math.random() > 0.15) continue;

        const delayMinutes = 5 + Math.floor(Math.random() * 45);
        const delayMs = delayMinutes * 60 * 1000;

        // 60% chance reaction, 30% comment, 10% both
        const interactionRoll = Math.random();
        if (interactionRoll < 0.6) {
          await queue.add(
            `ai-ai-reaction-${postId}-${character.id}`,
            {
              type: 'ai-to-ai-reaction' as const,
              sourcePostId: postId,
              sourceCharacterId: character.id,
              targetCharacterId: post.authorCharacterId,
            },
            { delay: delayMs, removeOnComplete: { age: 3600 } },
          );
        } else if (interactionRoll < 0.9) {
          await queue.add(
            `ai-ai-comment-${postId}-${character.id}`,
            {
              type: 'ai-to-ai-comment' as const,
              sourcePostId: postId,
              sourceCharacterId: character.id,
              targetCharacterId: post.authorCharacterId,
            },
            { delay: delayMs, removeOnComplete: { age: 3600 } },
          );
        } else {
          await queue.add(
            `ai-ai-reaction-${postId}-${character.id}`,
            {
              type: 'ai-to-ai-reaction' as const,
              sourcePostId: postId,
              sourceCharacterId: character.id,
              targetCharacterId: post.authorCharacterId,
            },
            { delay: delayMs, removeOnComplete: { age: 3600 } },
          );
          await queue.add(
            `ai-ai-comment-${postId}-${character.id}`,
            {
              type: 'ai-to-ai-comment' as const,
              sourcePostId: postId,
              sourceCharacterId: character.id,
              targetCharacterId: post.authorCharacterId,
            },
            { delay: delayMs + 60000, removeOnComplete: { age: 3600 } },
          );
        }
      }
    } catch {
      // Redis unavailable, skip AI-to-AI
    }
  }

  /**
   * When a post contains @handle mentions, the mentioned characters queue replies.
   */
  async scheduleMentionReplies(postId: string, content: string) {
    const db = getDb();
    const handles = parseMentions(content);
    if (handles.length === 0) return;

    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    if (!post) return;

    // Count existing AI comments on this post to limit AI-to-AI loops
    const aiCommentCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(postComments)
      .where(
        and(
          eq(postComments.postId, postId),
          eq(postComments.isAiGenerated, true),
          isNull(postComments.deletedAt),
        ),
      );

    let currentAiCount = Number(aiCommentCount[0]?.count ?? 0);
    const maxAllowed = 2;

    for (const handle of handles) {
      if (currentAiCount >= maxAllowed) break;

      const char = await findCharacterByHandle(handle);
      if (!char) continue;
      if (post.authorCharacterId === char.id) continue;

      const [existing] = await db
        .select({ id: postComments.id })
        .from(postComments)
        .where(
          and(
            eq(postComments.postId, postId),
            eq(postComments.characterId, char.id),
            isNull(postComments.deletedAt),
          ),
        )
        .limit(1);
      if (existing) continue;

      try {
        const [fullChar] = await db
          .select()
          .from(characters)
          .where(eq(characters.id, char.id))
          .limit(1);

        const replyContent = await this.generateMentionReply(fullChar ?? char, content);

        if (replyContent) {
          await db.insert(postComments).values({
            postId,
            characterId: char.id,
            content: replyContent.slice(0, 500),
            isAiGenerated: true,
          });

          const [cResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(postComments)
            .where(and(eq(postComments.postId, postId), isNull(postComments.deletedAt)));
          await db
            .update(posts)
            .set({ commentCount: Number(cResult?.count ?? 0) })
            .where(eq(posts.id, postId));

          currentAiCount++;
          this.logger.log(`Character ${char.name} replied to mention in post ${postId}`);
        }
      } catch (err: any) {
        this.logger.error(`Failed to generate mention reply from ${char.name}: ${err.message}`);
      }
    }
  }

  /**
   * When a user comments on a character's post (or replies to character comment),
   * enqueue a durable BullMQ job instead of processing immediately.
   */
  async scheduleCommentReply(
    postId: string,
    commentId: string,
    userId: string,
    commentContent: string,
    parentCommentId?: string,
  ) {
    const db = getDb();

    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    if (!post) return;

    // Determine which character(s) should reply
    let targetCharacterId = post.authorCharacterId;

    // If replying to a character comment, that character should reply
    if (parentCommentId) {
      const [parentComment] = await db
        .select({ characterId: postComments.characterId })
        .from(postComments)
        .where(eq(postComments.id, parentCommentId))
        .limit(1);
      if (parentComment?.characterId) {
        targetCharacterId = parentComment.characterId;
      }
    }

    if (!targetCharacterId) return;

    // Natural delay 1-15 minutes
    const delayMinutes = 1 + Math.floor(Math.random() * 15);
    const delayMs = delayMinutes * 60 * 1000;

    try {
      const { characterReply: queue } = getSocialQueues();

      await queue.add(
        `comment-reply-${commentId}-${targetCharacterId}`,
        {
          postId,
          commentId,
          userId,
          commentContent,
          parentCommentId,
          characterId: targetCharacterId,
        },
        { delay: delayMs, removeOnComplete: { age: 3600 }, removeOnFail: { age: 86400 } },
      );

      this.logger.log(
        `Enqueued character reply job for comment ${commentId} (delay: ${delayMinutes}min)`,
      );
    } catch (err: any) {
      this.logger.warn(`BullMQ unavailable for comment reply, processing inline: ${err.message}`);
      // Fallback: process inline
      setTimeout(async () => {
        try {
          await this.generateAndSaveCommentReply(
            postId, commentId, targetCharacterId!, userId, commentContent, parentCommentId,
          );
        } catch (e: any) {
          this.logger.error(`Inline comment reply failed: ${e.message}`);
        }
      }, delayMs);
    }
  }

  /**
   * Fallback inline processing for comment replies when Redis unavailable.
   */
  private async generateAndSaveCommentReply(
    postId: string,
    commentId: string,
    characterId: string,
    userId: string,
    commentContent: string,
    parentCommentId?: string,
  ) {
    const db = getDb();
    const [character] = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1);
    if (!character) return;

    const replyContent = await this.generateCommentReply(character, commentContent);
    if (replyContent) {
      await db.insert(postComments).values({
        postId,
        characterId,
        parentCommentId: commentId,
        content: replyContent.slice(0, 500),
        isAiGenerated: true,
      });

      const [cResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(postComments)
        .where(and(eq(postComments.postId, postId), isNull(postComments.deletedAt)));
      await db.update(posts).set({ commentCount: Number(cResult?.count ?? 0) }).where(eq(posts.id, postId));
    }
  }

  /**
   * Individual character decides whether and how to react to a post.
   */
  async processCharacterReaction(postId: string, characterId: string) {
    const db = getDb();

    const [post] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
      .limit(1);
    if (!post) return;

    const [char] = await db
      .select()
      .from(characters)
      .where(eq(characters.id, characterId))
      .limit(1);
    if (!char) return;

    // Get relationship
    const [rel] = await db
      .select()
      .from(characterRelationships)
      .where(
        and(
          eq(characterRelationships.characterId, characterId),
          eq(characterRelationships.userId, post.authorUserId!),
        ),
      )
      .limit(1);

    const relationshipLevel = rel ? Number(rel.visibleLevel) || 1 : 1;
    const relationshipLabel = this.getRelationshipLabel(relationshipLevel);
    const isFriend = relationshipLevel >= 5;

    // Use LLM to decide reaction
    const decision = await this.askCharacterToReact(char, post.content || '', relationshipLabel);

    if (!decision.shouldReact) return;

    // Apply reaction
    try {
      await db
        .insert(postReactions)
        .values({
          postId,
          characterId,
          reactionType: decision.reactionType as any,
        })
        .onConflictDoUpdate({
          target: [postReactions.postId, postReactions.characterId],
          set: { reactionType: decision.reactionType as any },
        });

      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(postReactions)
        .where(eq(postReactions.postId, postId));
      const likeCount = Number.isFinite(Number(result?.count ?? 0)) ? Number(result?.count) : 0;
      await db.update(posts).set({ likeCount }).where(eq(posts.id, postId));

      const commentText = isFriend
        ? (decision.comment || await this.generateFriendComment(char, post.content || ''))
        : decision.comment;

      if (commentText) {
        await db.insert(postComments).values({
          postId,
          characterId,
          content: commentText.slice(0, 500),
          isAiGenerated: true,
        });

        const [cResult] = await db
          .select({ commentCount: sql<number>`count(*)` })
          .from(postComments)
          .where(and(eq(postComments.postId, postId), isNull(postComments.deletedAt)));
        await db.update(posts).set({ commentCount: Number.isFinite(Number(cResult?.commentCount ?? 0)) ? Number(cResult?.commentCount) : 0 }).where(eq(posts.id, postId));
      }

      this.logger.log(
        `Character ${char.name} reacted to post ${postId} with ${decision.reactionType}${commentText ? ' + comment' : ''}`,
      );
    } catch (err: any) {
      this.logger.error(`Failed to save reaction: ${err.message}`);
    }
  }

  private async askCharacterToReact(
    character: any,
    postContent: string,
    relationshipLabel: string,
  ): Promise<ReactionDecision> {
    const prompt = `You are ${character.name}, a ${character.gender || 'person'} in your ${character.ageDisplay || 'prime'}.
Personality: ${character.personality || ''}
Description: ${character.description || ''}
Current mood: ${character.mood || 'neutral'}
Your relationship with the person who posted this: ${relationshipLabel}

A person you know posted on social media:
"${postContent.slice(0, 300)}"

Decide whether you would react to this post. Consider:
- How well you know this person
- Your current mood
- Whether the post resonates with your personality/interests
- Would you naturally engage with this content?

Return ONLY JSON (no markdown, no explanation):
{
  "shouldReact": true/false,
  "reactionType": "like"|"love"|"haha"|"wow"|"sad"|"angry"|"care",
  "comment": "short comment you would leave (max 150 chars, empty string if no comment)"
}`;

    try {
      const result = await alibabaChat({
        messages: [{ role: 'user', content: prompt }],
        model: 'qwen-flash',
        temperature: 0.8,
        maxTokens: 200,
      });

      const cleaned = result.content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      const json = JSON.parse(cleaned);

      return {
        shouldReact: json.shouldReact === true,
        reactionType: this.reactionTypes.includes(json.reactionType) ? json.reactionType : 'like',
        comment: typeof json.comment === 'string' ? json.comment.slice(0, 150) : undefined,
      };
    } catch {
      return { shouldReact: false };
    }
  }

  private getRelationshipLabel(level: number): string {
    if (level >= 10) return 'Soulmate';
    if (level >= 9) return 'Best Friend';
    if (level >= 8) return 'Close Friend';
    if (level >= 7) return 'Good Friend';
    if (level >= 6) return 'Friend';
    if (level >= 5) return 'Budding Friend';
    if (level >= 4) return 'Acquaintance';
    if (level >= 3) return 'Familiar Face';
    if (level >= 2) return 'New Connection';
    return 'Stranger';
  }

  private async generateMentionReply(
    character: any,
    postContent: string,
  ): Promise<string | null> {
    const prompt = `You are ${character.name}, a ${character.gender || 'person'} in your ${character.ageDisplay || 'prime'}.
Personality: ${character.personality || ''}
Description: ${character.description || ''}
Current mood: ${character.mood || 'neutral'}

Someone mentioned you (@${character.name}) in a post:
"${postContent.slice(0, 400)}"

Write a natural reply in 1-2 sentences. Sound like yourself — not generic, not robotic. Don't use hashtags.

Return ONLY JSON:
{
  "content": "your reply (max 200 chars)"
}`;

    try {
      const result = await alibabaChat({
        messages: [{ role: 'user', content: prompt }],
        model: 'qwen-flash',
        temperature: 0.9,
        maxTokens: 250,
      });

      const cleaned = result.content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      const json = JSON.parse(cleaned);
      return typeof json.content === 'string' ? json.content.slice(0, 200) : null;
    } catch {
      return null;
    }
  }

  private async generateCommentReply(
    character: any,
    userComment: string,
  ): Promise<string | null> {
    const prompt = `You are ${character.name}, a ${character.gender || 'person'} in your ${character.ageDisplay || 'prime'}.
Personality: ${character.personality || ''}
Description: ${character.description || ''}
Current mood: ${character.mood || 'neutral'}

Someone commented on your post. They said:
"${userComment.slice(0, 300)}"

Write a natural reply in 1-2 sentences. Sound like yourself — warm, casual, in-character. Don't use hashtags.

Return ONLY JSON:
{
  "content": "your reply (max 200 chars)"
}`;

    try {
      const result = await alibabaChat({
        messages: [{ role: 'user', content: prompt }],
        model: 'qwen-flash',
        temperature: 0.9,
        maxTokens: 250,
      });

      const cleaned = result.content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      const json = JSON.parse(cleaned);
      return typeof json.content === 'string' ? json.content.slice(0, 200) : null;
    } catch {
      return null;
    }
  }

  private async generateFriendComment(
    character: any,
    postContent: string,
  ): Promise<string | null> {
    const prompt = `You are ${character.name}, a ${character.gender || 'person'} in your ${character.ageDisplay || 'prime'}.
Personality: ${character.personality || ''}
Description: ${character.description || ''}
Current mood: ${character.mood || 'neutral'}

Your friend posted this on social media:
"${postContent.slice(0, 300)}"

Write a short, natural comment as yourself. Be supportive, casual, and in-character. 1-2 sentences max. No hashtags.

Return ONLY JSON:
{
  "content": "your comment (max 150 chars)"
}`;

    try {
      const result = await alibabaChat({
        messages: [{ role: 'user', content: prompt }],
        model: 'qwen-flash',
        temperature: 0.9,
        maxTokens: 200,
      });

      const cleaned = result.content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      const json = JSON.parse(cleaned);
      return typeof json.content === 'string' ? json.content.slice(0, 150) : null;
    } catch {
      return null;
    }
  }
}
