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

interface ReactionDecision {
  shouldReact: boolean;
  reactionType?: string;
  comment?: string;
  reason?: string;
}

@Injectable()
export class AiReactionsService {
  private readonly logger = new Logger(AiReactionsService.name);
  private readonly reactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'care'];

  /**
   * Called after a user creates a post. Schedules AI character reactions
   * with staggered delays to simulate natural timing.
   * Characters the user follows will react; characters with relationship >= 5 will also comment.
   */
  async scheduleReactions(postId: string, userId?: string) {
    const db = getDb();

    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    if (!post) return;

    // If post has authorCharacterId, it's from a character, not a user
    // If post is from a user (authorUserId exists), schedule friend reactions
    const authorUserId = post.authorUserId || userId;
    if (!authorUserId) return;

    // Get characters the user follows
    const follows = await db
      .select({
        characterId: characterFollows.characterId,
      })
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

    // For each character the user follows, decide reaction
    for (const character of followedChars) {
      // Check relationship level (friend threshold = 5)
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
      const isFriend = relationshipLevel >= 5;

      // Base probability based on relationship level
      const prob = Math.min(0.85, (relationshipLevel / 10) * 0.6 + 0.15);

      // Mood modifier
      const mood = character.mood || 'neutral';
      const moodMultiplier =
        mood === 'happy' ? 1.3 : mood === 'excited' ? 1.5 :
        mood === 'depressed' ? 0.2 : mood === 'sad' ? 0.3 :
        mood === 'angry' ? 0.3 : 1.0;

      if (Math.random() > prob * moodMultiplier) continue;

      // Random delay 1-30 minutes
      const delayMinutes = 1 + Math.floor(Math.random() * 30);
      const delayMs = delayMinutes * 60 * 1000;

      this.logger.log(
        `Scheduling ${isFriend ? 'friend' : 'follower'} reaction from ${character.name} to post ${postId} in ${delayMinutes}min`,
      );

      setTimeout(() => {
        this.processCharacterReaction(postId, character.id).catch((err) => {
          this.logger.error(
            `Failed to process reaction from ${character.id}: ${err.message}`,
          );
        });
      }, delayMs);
    }

    // Schedule mention replies (if post mentions any characters)
    this.scheduleMentionReplies(postId, post.content ?? '').catch(() => {});
  }

  /**
   * When a post contains @handle mentions, the mentioned characters reply.
   * Max 2 AI-to-AI replies per thread to prevent infinite loops.
   */
  async scheduleMentionReplies(postId: string, content: string) {
    const db = getDb();
    const handles = parseMentions(content);
    if (handles.length === 0) return;

    // Get the post to check if it's already an AI post (for depth tracking)
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
    const maxAllowed = 2; // Max AI-to-AI per thread

    for (const handle of handles) {
      if (currentAiCount >= maxAllowed) break;

      const char = await findCharacterByHandle(handle);
      if (!char) continue;

      // Don't let a character reply to their own post
      if (post.authorCharacterId === char.id) continue;

      // Check if this character already replied
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

        const replyContent = await this.generateMentionReply(
          fullChar ?? char,
          content,
        );

        if (replyContent) {
          await db.insert(postComments).values({
            postId,
            characterId: char.id,
            content: replyContent.slice(0, 500),
            isAiGenerated: true,
          });

          // Update comment count on the post
          const [cResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(postComments)
            .where(and(eq(postComments.postId, postId), isNull(postComments.deletedAt)));
          await db
            .update(posts)
            .set({ commentCount: Number(cResult?.count ?? 0) })
            .where(eq(posts.id, postId));

          // Count this reply toward AI-to-AI limit
          currentAiCount++;

          this.logger.log(
            `Character ${char.name} replied to mention in post ${postId}`,
          );
        }
      } catch (err: any) {
        this.logger.error(
          `Failed to generate mention reply from ${char.name}: ${err.message}`,
        );
      }
    }
  }

  /**
   * When a user comments on a character's post, the character replies.
   * Called from the posts endpoint after comment creation.
   * One reply only per comment pair.
   */
  async scheduleCommentReply(
    postId: string,
    commentId: string,
    userId: string,
    commentContent: string,
  ) {
    const db = getDb();

    // Get the post to check if it's from a character
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    if (!post || !post.authorCharacterId) return; // Only reply if post is from a character

    const [character] = await db
      .select()
      .from(characters)
      .where(eq(characters.id, post.authorCharacterId))
      .limit(1);
    if (!character) return;

    // Check if this character already replied to this comment
    const [existingReply] = await db
      .select({ id: postComments.id })
      .from(postComments)
      .where(
        and(
          eq(postComments.postId, postId),
          eq(postComments.parentCommentId, commentId),
          eq(postComments.characterId, character.id),
          isNull(postComments.deletedAt),
        ),
      )
      .limit(1);
    if (existingReply) return; // One reply per comment pair

    try {
      const replyContent = await this.generateCommentReply(
        character,
        commentContent,
      );

      if (replyContent) {
        await db.insert(postComments).values({
          postId,
          characterId: character.id,
          parentCommentId: commentId,
          content: replyContent.slice(0, 500),
          isAiGenerated: true,
        });

        // Update comment count on the post
        const [cResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(postComments)
          .where(and(eq(postComments.postId, postId), isNull(postComments.deletedAt)));
        await db
          .update(posts)
          .set({ commentCount: Number(cResult?.count ?? 0) })
          .where(eq(posts.id, postId));

        this.logger.log(
          `Character ${character.name} replied to user comment on their post ${postId}`,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to generate comment reply from ${character.name}: ${err.message}`,
      );
    }
  }

  /**
   * Individual character decides whether and how to react to a post.
   * Friends (level >= 5) always leave a comment.
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

      // Update like count
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(postReactions)
        .where(eq(postReactions.postId, postId));
      const likeCount = Number(result?.count ?? 0);
      await db
        .update(posts)
        .set({ likeCount })
        .where(eq(posts.id, postId));

      // Add comment: always for friends, per LLM decision for others
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
        await db
          .update(posts)
          .set({ commentCount: Number(cResult?.commentCount ?? 0) })
          .where(eq(posts.id, postId));
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

  /**
   * Generate an in-character reply when the character is @mentioned.
   */
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

  /**
   * Generate an in-character reply when a user comments on the character's post.
   */
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

  /**
   * Generate a friend's comment on a user's post (always called for level >= 5).
   */
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
