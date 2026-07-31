import { Job } from 'bullmq';
import { getDb } from '@itchats/database';
import {
  posts,
  postComments,
  characters,
  characterRelationships,
  notifications,
} from '@itchats/database/schema';
import { eq, and, sql, isNull, inArray } from 'drizzle-orm';
import { alibabaChat } from '@itchats/ai-core';
import type { CharacterReplyJob } from '../queues';

/**
 * Character Reply Processor
 *
 * When a user comments on a character's post (or directly replies to a character comment),
 * this processor:
 * 1. Loads post content, parent comment, nearby comments
 * 2. Loads user-character relationship
 * 3. Loads character identity and recent memory
 * 4. Decides whether to reply using LLM
 * 5. Avoids duplicate replies
 * 6. Delays naturally (1-15 min handled by queue delay)
 * 7. Persists reply + generates notification
 *
 * When user replies directly to character comment: increased reply probability
 */
export async function characterReplyProcessor(job: Job<CharacterReplyJob>) {
  const db = getDb();
  const { postId, commentId, userId, commentContent, parentCommentId, characterId } = job.data;

  // ── 1. Load post ──
  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
    .limit(1);
  if (!post) {
    return { skipped: true, reason: 'post not found or deleted' };
  }

  // ── 2. Load character who should reply ──
  const [character] = await db
    .select()
    .from(characters)
    .where(and(eq(characters.id, characterId), sql`${characters.deletedAt} IS NULL`))
    .limit(1);
  if (!character) {
    return { skipped: true, reason: 'character not found' };
  }

  // ── 3. Check for existing reply from this character (duplicate avoidance) ──
  // Check if character already replied to this exact comment
  const [existingReply] = await db
    .select({ id: postComments.id })
    .from(postComments)
    .where(
      and(
        eq(postComments.postId, postId),
        eq(postComments.parentCommentId, commentId),
        eq(postComments.characterId, characterId),
        isNull(postComments.deletedAt),
      ),
    )
    .limit(1);
  if (existingReply) {
    return { skipped: true, reason: 'character already replied to this comment' };
  }

  // Also check if character recently commented on this post (avoid spam)
  const [recentCharComment] = await db
    .select({ id: postComments.id, createdAt: postComments.createdAt })
    .from(postComments)
    .where(
      and(
        eq(postComments.postId, postId),
        eq(postComments.characterId, characterId),
        isNull(postComments.deletedAt),
      ),
    )
    .orderBy(sql`${postComments.createdAt} DESC`)
    .limit(1);

  if (recentCharComment) {
    const minutesSince = (Date.now() - new Date(recentCharComment.createdAt!).getTime()) / 60000;
    if (minutesSince < 5) {
      return { skipped: true, reason: 'character recently commented, cooling off' };
    }
  }

  // ── 4. Load user-character relationship ──
  const [rel] = await db
    .select()
    .from(characterRelationships)
    .where(
      and(
        eq(characterRelationships.characterId, characterId),
        eq(characterRelationships.userId, userId),
      ),
    )
    .limit(1);

  const relationshipLevel = rel ? Math.round(Number(rel.visibleLevel)) || 1 : 1;
  const relationshipLabel = getRelationshipLabel(relationshipLevel);
  const warmth = rel ? Number(rel.warmth) || 0 : 0;
  const trust = rel ? Number(rel.trust) || 0 : 0;

  // ── 5. Load nearby comments for context ──
  const nearbyComments = await db
    .select({
      content: postComments.content,
      authorName: sql<string>`COALESCE(${characters.name}, 'User')`,
    })
    .from(postComments)
    .leftJoin(characters, eq(postComments.characterId, characters.id))
    .where(
      and(
        eq(postComments.postId, postId),
        isNull(postComments.deletedAt),
        sql`${postComments.id} != ${commentId}`,
      ),
    )
    .orderBy(sql`${postComments.createdAt} DESC`)
    .limit(5);

  const threadContext = nearbyComments
    .map((c) => `${c.authorName}: ${(c.content || '').slice(0, 100)}`)
    .reverse()
    .join('\n');

  // ── 6. Decide reply probability ──
  const isDirectReplyToCharacter = !!parentCommentId;
  // Higher probability if user replied to character comment
  const baseProb = isDirectReplyToCharacter ? 0.85 : 0.45;
  // Relationship modifier
  const relModifier = Math.min(1, (relationshipLevel / 10) * 0.5 + warmth * 0.3 + trust * 0.2);
  // Mood modifier
  const mood = character.mood || 'neutral';
  const moodMultiplier =
    mood === 'happy' ? 1.3 : mood === 'excited' ? 1.4 : mood === 'playful' ? 1.2 :
    mood === 'sad' ? 0.3 : mood === 'depressed' ? 0.15 : mood === 'angry' ? 0.3 :
    mood === 'anxious' ? 0.5 : 1.0;

  const replyProbability = Math.min(0.95, baseProb * relModifier * moodMultiplier);

  if (Math.random() > replyProbability) {
    return { skipped: true, reason: `probability check failed (${(replyProbability * 100).toFixed(0)}%)` };
  }

  // ── 7. Generate reply using LLM ──
  const prompt = `You are ${character.name}, a ${character.gender || 'person'} in your ${character.ageDisplay || 'prime'}.
Personality: ${character.personality || ''}
Description: ${character.description || ''}
Speaking style: ${character.speakingStyle || 'natural and casual'}
Current mood: ${character.mood || 'neutral'}
Your relationship with this person: ${relationshipLabel} (level ${relationshipLevel}/10)

You made a post:
"${(post.content || '').slice(0, 300)}"

Someone commented on your post. They said:
"${commentContent.slice(0, 300)}"

${threadContext ? `Recent discussion on this post:\n${threadContext}` : ''}

Write a natural reply as yourself. ${isDirectReplyToCharacter ? 'They replied directly to your comment, so be warm and responsive.' : 'Reply to their comment on your post.'} 
1-2 sentences. Sound like a real person, NOT like an AI. Match your personality and speaking style.
${character.speakingStyle?.includes('egyptian') || character.speakingStyle?.includes('arabic') ? 'You may use Arabic if appropriate for your character.' : ''}

Return ONLY JSON (no markdown):
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
    const replyContent = typeof json.content === 'string' ? json.content.slice(0, 200) : null;

    if (!replyContent || replyContent.trim().length < 2) {
      return { skipped: true, reason: 'empty or too-short LLM response' };
    }

    // ── 8. Persist reply ──
    const [reply] = await db
      .insert(postComments)
      .values({
        postId,
        characterId,
        parentCommentId: commentId,
        content: replyContent.trim(),
        isAiGenerated: true,
      })
      .returning();

    // Update comment count
    const [cResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(postComments)
      .where(and(eq(postComments.postId, postId), isNull(postComments.deletedAt)));
    await db
      .update(posts)
      .set({ commentCount: Number(cResult?.count ?? 0), updatedAt: new Date() })
      .where(eq(posts.id, postId));

    // ── 9. Generate notification ──
    try {
      await db.insert(notifications).values({
        userId,
        type: 'comment_reply',
        title: `${character.name} replied to your comment`,
        body: replyContent.trim().slice(0, 200),
        data: {
          postId,
          commentId: reply!.id,
          characterId,
          type: 'comment_reply',
        },
      });
    } catch {
      // Non-critical
    }

    console.log(`[character-reply] ${character.name} replied to user comment on post ${postId}`);
    return { replied: true, replyId: reply!.id, characterName: character.name };
  } catch (err: any) {
    console.error(`[character-reply] Failed: ${err.message}`);
    return { skipped: true, reason: `error: ${err.message.slice(0, 100)}` };
  }
}

function getRelationshipLabel(level: number): string {
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
