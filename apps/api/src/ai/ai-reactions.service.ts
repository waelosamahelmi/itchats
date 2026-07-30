import { Injectable, Logger } from '@nestjs/common';
import { getDb } from '@itchats/database';
import {
  posts,
  postReactions,
  postComments,
  characterFollows,
  characters,
  characterRelationships,
} from '@itchats/database/schema';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { alibabaChat } from '@itchats/ai-core';

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
   */
  async scheduleReactions(postId: string) {
    const db = getDb();

    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    if (!post || !post.authorUserId) return;

    // Get all active public characters that have followers
    const allCharacters = await db
      .select()
      .from(characters)
      .where(
        and(
          eq(characters.status, 'published'),
          eq(characters.visibility, 'public'),
          sql`${characters.deletedAt} IS NULL`,
        ),
      );

    if (allCharacters.length === 0) return;

    // For each character, decide whether and when to react
    for (const character of allCharacters) {
      // Check relationship between post author and character
      const [rel] = await db
        .select()
        .from(characterRelationships)
        .where(
          and(
            eq(characterRelationships.characterId, character.id),
            eq(characterRelationships.userId, post.authorUserId),
          ),
        )
        .limit(1);

      const relationshipLevel = rel ? Number(rel.visibleLevel) || 0 : 0;
      const warmth = rel ? Number(rel.warmth) || 0 : 0;

      // Probability calculation
      const mood = character.mood || 'neutral';
      const moodMultiplier =
        mood === 'happy' ? 1.5 :
        mood === 'excited' ? 1.3 :
        mood === 'depressed' ? 0.2 :
        mood === 'sad' ? 0.3 :
        mood === 'angry' ? 0.4 :
        1.0;

      // Base probability: higher relationship = more likely
      const baseProb = Math.min(0.7, (relationshipLevel / 10) * 0.5 + warmth * 0.2);
      const finalProb = baseProb * moodMultiplier;

      // Random check
      if (Math.random() > finalProb) continue;

      // Schedule with staggered delay (1-60 minutes)
      const delayMinutes = 1 + Math.floor(Math.random() * 60);
      const delayMs = delayMinutes * 60 * 1000;

      this.logger.log(
        `Scheduling reaction from ${character.name} to post ${postId} in ${delayMinutes}min`,
      );

      // Use setTimeout for simple scheduling (BullMQ would be used in production)
      setTimeout(() => {
        this.processCharacterReaction(postId, character.id).catch((err) => {
          this.logger.error(
            `Failed to process reaction from ${character.id}: ${err.message}`,
          );
        });
      }, delayMs);
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

      // Add comment if character decided to
      if (decision.comment) {
        await db.insert(postComments).values({
          postId,
          characterId,
          content: decision.comment.slice(0, 500),
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
        `Character ${char.name} reacted to post ${postId} with ${decision.reactionType}`,
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
}
