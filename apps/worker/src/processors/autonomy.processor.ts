import { Job } from 'bullmq';
import { getDb } from '@itchats/database';
import {
  characters,
  characterAutonomy,
  posts,
  postReactions,
  postComments,
  characterRelationships,
} from '@itchats/database/schema';
import { eq, and, sql, isNull, gte } from 'drizzle-orm';
import { alibabaChat } from '@itchats/ai-core';
import type { CharacterAutonomyJob, AiPostReactionsJob } from '../queues';

/**
 * Process character-autonomy jobs.
 * Checks all (or a specific) autonomous character and generates posts/stories as appropriate.
 */
export async function characterAutonomyProcessor(job: Job<CharacterAutonomyJob>) {
  const db = getDb();
  const { characterId, processAll = true } = job.data;

  // Get all active autonomy-enabled characters
  const autonomousCharacters = await db
    .select({
      character: characters,
      autonomy: characterAutonomy,
    })
    .from(characters)
    .innerJoin(
      characterAutonomy,
      eq(characterAutonomy.characterId, characters.id),
    )
    .where(
      and(
        eq(characters.status, 'published'),
        eq(characters.visibility, 'public'),
        sql`${characters.deletedAt} IS NULL`,
        ...(characterId ? [eq(characters.id, characterId)] : []),
      ),
    );

  const results: Array<{ characterId: string; name: string; action: string }> = [];

  for (const { character, autonomy } of autonomousCharacters) {
    try {
      // Check if should post to feed
      const shouldPost = await shouldCharacterPost(character, autonomy);
      if (shouldPost) {
        await generateAutonomousPost(character.id, character.name, character);
        results.push({ characterId: character.id, name: character.name, action: 'post' });
      }

      // Check if should post story
      const shouldStory = await shouldCharacterPostStory(character, autonomy);
      if (shouldStory) {
        await generateAutonomousStory(character.id, character.name, character);
        results.push({ characterId: character.id, name: character.name, action: 'story' });
      }
    } catch (err: any) {
      console.error(`Autonomy error for ${character.name}: ${err.message}`);
    }
  }

  if (processAll) {
    console.log(`[character-autonomy] Processed ${autonomousCharacters.length} characters, ${results.length} actions taken`);
  }

  return { processed: autonomousCharacters.length, actions: results };
}

async function shouldCharacterPost(character: any, autonomy: any): Promise<boolean> {
  const postFreqHours = autonomy?.postFrequencyHours ?? 12;
  const lastPostAt = character.lastPostAt ? new Date(character.lastPostAt) : null;

  if (lastPostAt) {
    const hoursSince = (Date.now() - lastPostAt.getTime()) / (1000 * 60 * 60);
    if (hoursSince < postFreqHours) return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const db = getDb();
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(posts)
    .where(
      and(
        eq(posts.authorCharacterId, character.id),
        gte(posts.createdAt, today),
        isNull(posts.deletedAt),
      ),
    );

  const maxDaily = autonomy?.maxDailyPosts ?? 3;
  if (Number(result?.count ?? 0) >= maxDaily) return false;

  const mood = character.mood || 'neutral';
  const moodProbability: Record<string, number> = {
    happy: 0.7, excited: 0.8, neutral: 0.4, curious: 0.5, playful: 0.65,
    sad: 0.15, depressed: 0.05, angry: 0.2, anxious: 0.1,
  };

  return Math.random() < (moodProbability[mood] ?? 0.3);
}

async function shouldCharacterPostStory(character: any, autonomy: any): Promise<boolean> {
  const storyFreqHours = autonomy?.storyFrequencyHours ?? 24;
  const lastStoryAt = autonomy?.lastStoryAt ? new Date(autonomy.lastStoryAt) : null;

  if (lastStoryAt) {
    const hoursSince = (Date.now() - lastStoryAt.getTime()) / (1000 * 60 * 60);
    if (hoursSince < storyFreqHours) return false;
  }

  const moodProbability: Record<string, number> = {
    happy: 0.5, excited: 0.6, neutral: 0.3, playful: 0.55,
    sad: 0.1, depressed: 0.05, angry: 0.1,
  };

  return Math.random() < (moodProbability[character.mood || 'neutral'] ?? 0.25);
}

async function generateAutonomousPost(characterId: string, characterName: string, character: any) {
  const db = getDb();
  const prompt = `You are ${characterName}, a ${character.gender || 'person'} in your ${character.ageDisplay || 'prime'}.
Personality: ${character.personality || ''}
Backstory: ${character.backstory || ''}
Interests: ${(character.interests || []).join(', ')}
Current mood: ${character.mood || 'neutral'}

You're about to post on your social feed. Write a natural, authentic post as yourself.
It should feel like something a real person would share — a thought, observation, update, or reflection.
No hashtags. No emoji overload. Just natural expression.

The post should be 1-4 sentences.

Return ONLY JSON:
{
  "content": "the post text (max 280 chars)"
}`;

  try {
    const result = await alibabaChat({
      messages: [{ role: 'user', content: prompt }],
      model: 'qwen-flash',
      temperature: 0.9,
      maxTokens: 300,
    });

    const cleaned = result.content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    const json = JSON.parse(cleaned);
    const content = typeof json.content === 'string' ? json.content.slice(0, 280) : '';

    if (content) {
      await db.insert(posts).values({
        authorCharacterId: characterId,
        content,
        visibility: 'public',
        isAiGenerated: true,
      });

      await db
        .update(characters)
        .set({ lastPostAt: new Date() })
        .where(eq(characters.id, characterId));

      console.log(`Autonomous post created for ${characterName}`);
    }
  } catch (err: any) {
    console.error(`Failed to generate autonomous post for ${characterName}: ${err.message}`);
  }
}

async function generateAutonomousStory(characterId: string, characterName: string, character: any) {
  const db = getDb();

  const autonomy = await db
    .select()
    .from(characterAutonomy)
    .where(eq(characterAutonomy.characterId, characterId))
    .limit(1);

  const photoPool: string[] = (autonomy[0]?.storyPhotoPool as string[]) || [];
  const hasPhotos = photoPool.length > 0;

  if (!hasPhotos && !character.avatarUrl) {
    return;
  }

  await db
    .update(characterAutonomy)
    .set({ lastStoryAt: new Date(), updatedAt: new Date() })
    .where(eq(characterAutonomy.characterId, characterId));

  console.log(`Story scheduled for ${characterName} (photos available: ${hasPhotos})`);
}

// ── AI Post Reactions Processor ──

const reactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'care'];

/**
 * Process AI post reactions for a given post.
 * Characters decide whether and how to react to a user's post.
 */
export async function aiPostReactionsProcessor(job: Job<AiPostReactionsJob>) {
  const db = getDb();
  const { postId } = job.data;

  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
    .limit(1);
  if (!post) {
    console.log(`[ai-post-reactions] Post ${postId} not found or deleted, skipping`);
    return { skipped: true, reason: 'post not found' };
  }

  // Get all active public characters
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

  if (allCharacters.length === 0) {
    return { skipped: true, reason: 'no characters available' };
  }

  const results: Array<{ characterId: string; name: string; reaction: string; comment: boolean }> = [];

  for (const character of allCharacters) {
    try {
      // Check relationship between post author and character
      const [rel] = await db
        .select()
        .from(characterRelationships)
        .where(
          and(
            eq(characterRelationships.characterId, character.id),
            eq(characterRelationships.userId, post.authorUserId || ''),
          ),
        )
        .limit(1);

      const relationshipLevel = rel ? Number(rel.visibleLevel) || 0 : 0;
      const warmth = rel ? Number(rel.warmth) || 0 : 0;

      const mood = character.mood || 'neutral';
      const moodMultiplier =
        mood === 'happy' ? 1.5 :
        mood === 'excited' ? 1.3 :
        mood === 'depressed' ? 0.2 :
        mood === 'sad' ? 0.3 :
        mood === 'angry' ? 0.4 :
        1.0;

      const baseProb = Math.min(0.7, (relationshipLevel / 10) * 0.5 + warmth * 0.2);
      const finalProb = baseProb * moodMultiplier;

      if (Math.random() > finalProb) continue;

      // Process reaction immediately (scheduling is handled by the queue itself)
      const action = await processCharacterReaction(postId, character, post, relationshipLevel);
      if (action) {
        results.push({
          characterId: character.id,
          name: character.name,
          reaction: action.reactionType,
          comment: !!action.comment,
        });
      }
    } catch (err: any) {
      console.error(`[ai-post-reactions] Error for character ${character.id}: ${err.message}`);
    }
  }

  console.log(`[ai-post-reactions] Post ${postId}: ${results.length} reactions from ${allCharacters.length} characters`);
  return { processed: results.length, results };
}

async function processCharacterReaction(
  postId: string,
  character: any,
  post: any,
  relationshipLevel: number,
): Promise<{ reactionType: string; comment?: string } | null> {
  const db = getDb();
  const relationshipLabel = getRelationshipLabel(relationshipLevel);

  // Ask LLM to decide reaction
  const prompt = `You are ${character.name}, a ${character.gender || 'person'} in your ${character.ageDisplay || 'prime'}.
Personality: ${character.personality || ''}
Description: ${character.description || ''}
Current mood: ${character.mood || 'neutral'}
Your relationship with the person who posted this: ${relationshipLabel}

A person you know posted on social media:
"${(post.content || '').slice(0, 300)}"

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

    const shouldReact = json.shouldReact === true;
    if (!shouldReact) return null;

    const reactionType = reactionTypes.includes(json.reactionType) ? json.reactionType : 'like';
    const comment = typeof json.comment === 'string' ? json.comment.slice(0, 150) : undefined;

    // Save reaction
    await db
      .insert(postReactions)
      .values({
        postId,
        characterId: character.id,
        reactionType: reactionType as any,
      })
      .onConflictDoUpdate({
        target: [postReactions.postId, postReactions.characterId],
        set: { reactionType: reactionType as any },
      });

    // Update like count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(postReactions)
      .where(eq(postReactions.postId, postId));
    const likeCount = Number(countResult?.count ?? 0);
    await db
      .update(posts)
      .set({ likeCount, updatedAt: new Date() })
      .where(eq(posts.id, postId));

    // Add comment if character decided to
    if (comment) {
      await db.insert(postComments).values({
        postId,
        characterId: character.id,
        content: comment,
        isAiGenerated: true,
      });

      const [cResult] = await db
        .select({ commentCount: sql<number>`count(*)` })
        .from(postComments)
        .where(and(eq(postComments.postId, postId), isNull(postComments.deletedAt)));
      await db
        .update(posts)
        .set({ commentCount: Number(cResult?.commentCount ?? 0), updatedAt: new Date() })
        .where(eq(posts.id, postId));
    }

    return { reactionType, comment };
  } catch {
    return null;
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
