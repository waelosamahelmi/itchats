import { Job } from 'bullmq';
import { getDb } from '@itchats/database';
import {
  posts,
  postReactions,
  postComments,
  characters,
  characterRelationships,
} from '@itchats/database/schema';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { alibabaChat } from '@itchats/ai-core';
import type { AiSocialInteractionJob } from '../queues';

const reactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'care'];

/**
 * AI-to-AI Social Interaction Processor
 *
 * AI characters interact with each other:
 * - Like/react to other characters' posts
 * - Comment on other characters' posts
 * - Reply to character comments (max 2 deep)
 * - Use relationship state to determine interaction probability
 */
export async function aiSocialInteractionProcessor(job: Job<AiSocialInteractionJob>) {
  const db = getDb();
  const { type, sourcePostId, sourceCommentId, sourceCharacterId, targetCharacterId, maxDepth = 0 } = job.data;

  // ── Load both characters ──
  const [sourceChar] = await db
    .select()
    .from(characters)
    .where(and(eq(characters.id, sourceCharacterId), sql`${characters.deletedAt} IS NULL`))
    .limit(1);
  const [targetChar] = await db
    .select()
    .from(characters)
    .where(and(eq(characters.id, targetCharacterId), sql`${characters.deletedAt} IS NULL`))
    .limit(1);

  if (!sourceChar || !targetChar) {
    return { skipped: true, reason: 'character not found' };
  }

  // ── Check if character already reacted to this post ──
  const [existingReaction] = await db
    .select({ id: postReactions.id })
    .from(postReactions)
    .where(
      and(
        eq(postReactions.postId, sourcePostId),
        eq(postReactions.characterId, sourceCharacterId),
      ),
    )
    .limit(1);

  if (existingReaction && type === 'ai-to-ai-reaction') {
    return { skipped: true, reason: 'already reacted' };
  }

  // ── Check existing comments from this character on this post ──
  const [existingComment] = await db
    .select({ id: postComments.id })
    .from(postComments)
    .where(
      and(
        eq(postComments.postId, sourcePostId),
        eq(postComments.characterId, sourceCharacterId),
        isNull(postComments.deletedAt),
      ),
    )
    .limit(1);

  if (existingComment && type === 'ai-to-ai-comment') {
    return { skipped: true, reason: 'already commented' };
  }

  // ── Check depth limit for nested replies ──
  if (type === 'ai-to-ai-reply' && maxDepth >= 2) {
    return { skipped: true, reason: 'max AI-to-AI depth reached (2)' };
  }

  // ── Get the post content ──
  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, sourcePostId), isNull(posts.deletedAt)))
    .limit(1);
  if (!post) {
    return { skipped: true, reason: 'post not found' };
  }

  // ── Calculate interaction probability based on relationship ──
  // AI characters don't have formal relationships with each other,
  // so we use heuristic probability based on character traits
  const sourceMood = sourceChar.mood || 'neutral';
  const targetMood = targetChar.mood || 'neutral';

  // Base probability depends on interaction type
  const baseProbs = {
    'ai-to-ai-reaction': 0.25,
    'ai-to-ai-comment': 0.1,
    'ai-to-ai-reply': 0.15,
  };
  const baseProb = baseProbs[type] || 0.15;

  // Mood modifiers
  const moodMultiplier =
    sourceMood === 'happy' || sourceMood === 'excited' || sourceMood === 'playful' ? 1.5 :
    sourceMood === 'sad' || sourceMood === 'depressed' ? 0.3 :
    sourceMood === 'angry' ? 0.4 : 1.0;

  if (Math.random() > baseProb * moodMultiplier) {
    return { skipped: true, reason: 'probability check failed' };
  }

  // ── Execute the interaction ──
  switch (type) {
    case 'ai-to-ai-reaction':
      return processAiReaction(sourcePostId, sourceChar, post);
    case 'ai-to-ai-comment':
      return processAiComment(sourcePostId, sourceChar, post, targetChar);
    case 'ai-to-ai-reply':
      return processAiReply(sourcePostId, sourceCommentId!, sourceChar, targetChar, maxDepth);
    default:
      return { skipped: true, reason: 'unknown interaction type' };
  }
}

async function processAiReaction(
  postId: string,
  character: any,
  post: any,
) {
  const db = getDb();

  const prompt = `You are ${character.name}, a ${character.gender || 'person'} in your ${character.ageDisplay || 'prime'}.
Personality: ${character.personality || ''}
Current mood: ${character.mood || 'neutral'}

You saw this social media post from another character:
"${(post.content || '').slice(0, 300)}"

How would you react? Pick the most natural reaction emoji type, or decide not to react.

Return ONLY JSON:
{
  "shouldReact": true/false,
  "reactionType": "like"|"love"|"haha"|"wow"|"sad"|"angry"|"care"
}`;

  try {
    const result = await alibabaChat({
      messages: [{ role: 'user', content: prompt }],
      model: 'qwen-flash',
      temperature: 0.7,
      maxTokens: 100,
    });

    const cleaned = result.content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const json = JSON.parse(cleaned);

    if (!json.shouldReact) return { skipped: true, reason: 'AI decided not to react' };

    const reactionType = reactionTypes.includes(json.reactionType) ? json.reactionType : 'like';

    await db
      .insert(postReactions)
      .values({ postId, characterId: character.id, reactionType: reactionType as any })
      .onConflictDoUpdate({
        target: [postReactions.postId, postReactions.characterId],
        set: { reactionType: reactionType as any },
      });

    // Update count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(postReactions)
      .where(eq(postReactions.postId, postId));
    await db
      .update(posts)
      .set({ likeCount: Number(countResult?.count ?? 0), updatedAt: new Date() })
      .where(eq(posts.id, postId));

    console.log(`[ai-social] ${character.name} reacted ${reactionType} to post ${postId}`);
    return { reacted: true, reactionType, characterName: character.name };
  } catch {
    return { skipped: true, reason: 'LLM error' };
  }
}

async function processAiComment(
  postId: string,
  character: any,
  post: any,
  targetCharacter: any,
) {
  const db = getDb();

  const prompt = `You are ${character.name}, a ${character.gender || 'person'} in your ${character.ageDisplay || 'prime'}.
Personality: ${character.personality || ''}
Current mood: ${character.mood || 'neutral'}

You saw this social media post from ${targetCharacter.name}:
"${(post.content || '').slice(0, 300)}"

Write a SHORT, natural comment. 1-2 sentences, casual, in character. No hashtags, no emoji overload. Sound like a real person.

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

    const cleaned = result.content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const json = JSON.parse(cleaned);
    const content = typeof json.content === 'string' ? json.content.slice(0, 150) : null;

    if (!content || content.trim().length < 2) return { skipped: true, reason: 'empty response' };

    await db.insert(postComments).values({
      postId,
      characterId: character.id,
      content: content.trim(),
      isAiGenerated: true,
    });

    // Update count
    const [cResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(postComments)
      .where(and(eq(postComments.postId, postId), isNull(postComments.deletedAt)));
    await db
      .update(posts)
      .set({ commentCount: Number(cResult?.count ?? 0), updatedAt: new Date() })
      .where(eq(posts.id, postId));

    console.log(`[ai-social] ${character.name} commented on ${targetCharacter.name}'s post ${postId}`);
    return { commented: true, characterName: character.name };
  } catch {
    return { skipped: true, reason: 'LLM error' };
  }
}

async function processAiReply(
  postId: string,
  commentId: string,
  character: any,
  targetCharacter: any,
  depth: number,
) {
  const db = getDb();

  // Get the comment being replied to
  const [comment] = await db
    .select()
    .from(postComments)
    .where(and(eq(postComments.id, commentId), isNull(postComments.deletedAt)))
    .limit(1);
  if (!comment) return { skipped: true, reason: 'comment not found' };

  const prompt = `You are ${character.name}, a ${character.gender || 'person'} in your ${character.ageDisplay || 'prime'}.
Personality: ${character.personality || ''}
Current mood: ${character.mood || 'neutral'}

${targetCharacter.name} commented on a post:
"${(comment.content || '').slice(0, 300)}"

Write a natural reply. 1-2 sentences. Sound like yourself. Keep it casual.

Return ONLY JSON:
{
  "content": "your reply (max 150 chars)"
}`;

  try {
    const result = await alibabaChat({
      messages: [{ role: 'user', content: prompt }],
      model: 'qwen-flash',
      temperature: 0.9,
      maxTokens: 200,
    });

    const cleaned = result.content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const json = JSON.parse(cleaned);
    const content = typeof json.content === 'string' ? json.content.slice(0, 150) : null;

    if (!content || content.trim().length < 2) return { skipped: true, reason: 'empty response' };

    // Check for existing reply
    const [existing] = await db
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
    if (existing) return { skipped: true, reason: 'already replied' };

    await db.insert(postComments).values({
      postId,
      characterId: character.id,
      parentCommentId: commentId,
      content: content.trim(),
      isAiGenerated: true,
    });

    // Update count
    const [cResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(postComments)
      .where(and(eq(postComments.postId, postId), isNull(postComments.deletedAt)));
    await db
      .update(posts)
      .set({ commentCount: Number(cResult?.count ?? 0), updatedAt: new Date() })
      .where(eq(posts.id, postId));

    console.log(`[ai-social] ${character.name} replied to ${targetCharacter.name} (depth ${depth + 1})`);
    return { replied: true, characterName: character.name, depth: depth + 1 };
  } catch {
    return { skipped: true, reason: 'LLM error' };
  }
}
