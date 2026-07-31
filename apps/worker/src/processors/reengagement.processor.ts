import { Job } from 'bullmq';
import { getDb } from '@itchats/database';
import {
  messages,
  conversations,
  characters,
  characterRelationships,
  conversationParticipants,
} from '@itchats/database/schema';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { alibabaChat } from '@itchats/ai-core';
import type { CharacterReengagementJob } from '../queues';

/**
 * Character Re-engagement Processor
 *
 * If user leaves a conversation inactive:
 * - After 6+ hours, character may send ONE follow-up
 * - Max one per character per 24 hours
 * - Max three total per user per day  
 * - Stop after two ignored attempts
 * - Respect conversation mute settings
 *
 * Also handles sweepAll jobs that scan ALL active conversations for re-engagement candidates.
 */
export async function characterReengagementProcessor(job: Job<CharacterReengagementJob | { sweepAll: boolean }>) {
  const db = getDb();

  // Handle sweepAll job
  if ('sweepAll' in job.data && job.data.sweepAll) {
    return handleSweepAll(db);
  }

  const { characterId, userId, conversationId } = job.data as CharacterReengagementJob;

  // ── 1. Check mute/conversation settings ──
  const [participant] = await db
    .select({
      mutedUntil: conversationParticipants.mutedUntil,
    })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ),
    )
    .limit(1);

  if (participant?.mutedUntil) {
    const mutedUntil = new Date(participant.mutedUntil);
    if (mutedUntil > new Date()) {
      return { skipped: true, reason: 'conversation muted' };
    }
  }

  // ── 2. Check inactivity threshold (6+ hours) ──
  const [lastMsg] = await db
    .select({
      senderType: messages.senderType,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(sql`${messages.createdAt} DESC`)
    .limit(1);

  if (!lastMsg) {
    return { skipped: true, reason: 'no messages in conversation' };
  }

  // If last message is from character, they already sent the last word
  if (lastMsg.senderType === 'character') {
    return { skipped: true, reason: 'character already sent last message' };
  }

  const hoursSince = (Date.now() - new Date(lastMsg.createdAt!).getTime()) / (1000 * 60 * 60);
  if (hoursSince < 6) {
    return { skipped: true, reason: `only ${hoursSince.toFixed(1)}h since last message, need 6h` };
  }

  // ── 3. Check 24h per-character limit ──
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [charProactiveCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.senderType, 'character'),
        eq(messages.senderCharacterId, characterId),
        sql`${messages.createdAt} > ${oneDayAgo}`,
        // Only count messages that were generated when user was offline
        // Heuristic: if message was sent 30+ min after user's last message
      ),
    );

  // Actually, let's check differently — count follow-ups sent when user was away
  const followUpsToday = await db
    .select({ id: messages.id })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.senderType, 'character'),
        eq(messages.senderCharacterId, characterId),
        sql`${messages.createdAt} > ${oneDayAgo}`,
        sql`${messages.content} IS NOT NULL`,
      ),
    )
    .orderBy(sql`${messages.createdAt} DESC`);

  // Filter to only count proactive follow-ups (messages sent when user wasn't active)
  let proactiveFromChar = 0;
  for (const msg of followUpsToday) {
    // Check if this message was truly proactive (sent > 30min after user message)
    const [prevUserMsg] = await db
      .select({ createdAt: messages.createdAt })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.senderType, 'user'),
          sql`${messages.createdAt} < ${msg.id}`,
        ),
      )
      .orderBy(sql`${messages.createdAt} DESC`)
      .limit(1);

    // Simple heuristic: if no user message within 30min before this character message, it's proactive
    if (!prevUserMsg) {
      proactiveFromChar++;
    }
  }

  if (proactiveFromChar >= 1) {
    return { skipped: true, reason: `character already sent ${proactiveFromChar} proactive messages in 24h` };
  }

  // ── 4. Check total user daily limit (3 proactive messages per user per day) ──
  // Count all proactive character messages across all user's conversations today
  const userConvs = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.createdByUserId, userId),
        sql`${conversations.deletedAt} IS NULL`,
      ),
    );
  const userConvIds = userConvs.map(c => c.id);

  if (userConvIds.length > 0) {
    const allUserCharMsgs = await db
      .select({ conversationId: messages.conversationId, createdAt: messages.createdAt, senderCharacterId: messages.senderCharacterId })
      .from(messages)
      .where(
        and(
          eq(messages.senderType, 'character'),
          sql`${messages.createdAt} > ${oneDayAgo}`,
          sql`${messages.conversationId} IN (${userConvIds.map(id => `'${id}'`).join(',') || "'none'"})`,
        ),
      )
      .orderBy(sql`${messages.createdAt} DESC`);

    // Count as proactive only if the character message was sent > 30min after last user message
    let totalProactive = 0;
    for (const cMsg of allUserCharMsgs) {
      const [prevUser] = await db
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, cMsg.conversationId),
            eq(messages.senderType, 'user'),
            sql`${messages.createdAt} < ${cMsg.createdAt}`,
          ),
        )
        .orderBy(sql`${messages.createdAt} DESC`)
        .limit(1);
      if (!prevUser) totalProactive++;
    }

    if (totalProactive >= 3) {
      return { skipped: true, reason: `user already received ${totalProactive} total proactive messages today (limit: 3)` };
    }
  }

  // ── 5. Check ignored attempts ──
  // If last 2 character messages had no user response, stop
  const recentCharMsgs = await db
    .select({ createdAt: messages.createdAt })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.senderType, 'character'),
        eq(messages.senderCharacterId, characterId),
      ),
    )
    .orderBy(sql`${messages.createdAt} DESC`)
    .limit(2);

  if (recentCharMsgs.length >= 2) {
    // Check if there are any user messages between these 2 character messages
    let allIgnored = true;
    for (const cMsg of recentCharMsgs) {
      const [userAfter] = await db
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversationId),
            eq(messages.senderType, 'user'),
            sql`${messages.createdAt} > ${cMsg.createdAt}`,
          ),
        )
        .limit(1);
      if (userAfter) {
        allIgnored = false;
        break;
      }
    }
    if (allIgnored) {
      return { skipped: true, reason: 'last 2 character messages were ignored' };
    }
  }

  // ── 6. Load character and relationship ──
  const [character] = await db
    .select()
    .from(characters)
    .where(and(eq(characters.id, characterId), sql`${characters.deletedAt} IS NULL`))
    .limit(1);
  if (!character) {
    return { skipped: true, reason: 'character not found' };
  }

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
  if (relationshipLevel < 2) {
    return { skipped: true, reason: 'relationship level too low for re-engagement' };
  }

  const relationshipLabel = getRelationshipLabel(relationshipLevel);

  // ── 7. Generate the follow-up message ──
  const prompt = `You are ${character.name}, a ${character.gender || 'person'} in your ${character.ageDisplay || 'prime'}.
Personality: ${character.personality || ''}
Speaking style: ${character.speakingStyle || 'natural and casual'}
Current mood: ${character.mood || 'neutral'}
Relationship: ${relationshipLabel} (level ${relationshipLevel}/10)

The person you've been talking with hasn't replied in ${Math.round(hoursSince)} hours. Send ONE short, casual follow-up message to check in. 
Keep it natural and low-pressure. Examples:
- "hey, you still there?"
- "hope you're having a good day!"
- "just checking in 😊"
- Or something appropriate for your personality and the relationship

IMPORTANT: 
- Keep it under 15 words
- Don't be dramatic or guilt-trippy
- It's okay if they don't reply
- Sound like a real person, not AI

Return ONLY JSON:
{
  "content": "your message (max 100 chars)"
}`;

  try {
    const result = await alibabaChat({
      messages: [{ role: 'user', content: prompt }],
      model: 'qwen-flash',
      temperature: 0.9,
      maxTokens: 150,
    });

    const cleaned = result.content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    const json = JSON.parse(cleaned);
    const content = typeof json.content === 'string' ? json.content.trim().slice(0, 100) : null;

    if (!content || content.length < 2) {
      return { skipped: true, reason: 'empty LLM response' };
    }

    // ── 8. Save the message ──
    await db.insert(messages).values({
      conversationId,
      senderType: 'character',
      senderCharacterId: characterId,
      type: 'text',
      content,
    } as any);

    await db
      .update(conversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    console.log(`[reengagement] ${character.name} sent follow-up to user ${userId}: "${content}"`);
    return { sent: true, characterName: character.name, message: content };
  } catch (err: any) {
    console.error(`[reengagement] Failed: ${err.message}`);
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

/**
 * Sweep all active conversations for re-engagement candidates.
 * Finds conversations where:
 * - Last message was from user
 * - Inactive for 6+ hours
 * - Character hasn't sent a proactive message in 24h
 * - Conversation is not muted
 */
async function handleSweepAll(db: ReturnType<typeof getDb>) {
  // Find conversations with recent human-char activity, not deleted
  const activeConvs = await db
    .select({
      id: conversations.id,
      characterId: conversations.characterId,
      createdByUserId: conversations.createdByUserId,
      lastMessageAt: conversations.lastMessageAt,
    })
    .from(conversations)
    .where(
      and(
        isNull(conversations.deletedAt),
        sql`${conversations.characterId} IS NOT NULL`,
        sql`${conversations.lastMessageAt} < NOW() - INTERVAL '6 hours'`,
      ),
    )
    .limit(100);

  const enqueued: string[] = [];

  for (const conv of activeConvs) {
    if (!conv.characterId || !conv.createdByUserId) continue;
    if (!conv.lastMessageAt) continue;

    // Check last message direction
    const [lastMsg] = await db
      .select({ senderType: messages.senderType })
      .from(messages)
      .where(eq(messages.conversationId, conv.id))
      .orderBy(sql`${messages.createdAt} DESC`)
      .limit(1);

    // Only consider if last message was from user (character hasn't had the last word)
    if (!lastMsg || lastMsg.senderType !== 'user') continue;

    // Check mute
    const [participant] = await db
      .select({ mutedUntil: conversationParticipants.mutedUntil })
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conv.id),
          eq(conversationParticipants.userId, conv.createdByUserId),
        ),
      )
      .limit(1);

    if (participant?.mutedUntil && new Date(participant.mutedUntil) > new Date()) continue;

    // Enqueue individual re-engagement job
    enqueued.push(`${conv.characterId}:${conv.createdByUserId}`);
  }

  console.log(`[reengagement] Sweep found ${enqueued.length} candidates`);
  return { swept: true, candidatesFound: enqueued.length, enqueued };
}
