import { Injectable, Inject } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characters, characterRelationships, messages, conversations } from '@itchats/database/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { MemoryService } from './memory.service';

export interface AssembledContext {
  systemPrompt: string;
  recentMessages: { role: string; content: string }[];
  memories: string[];
  relationship: Record<string, number>;
  characterName: string;
  characterEmotion?: string;
}

@Injectable()
export class ContextBuilderService {
  constructor(
    @Inject(MemoryService) private readonly memoryService: MemoryService,
  ) {}

  async buildContext(
    characterId: string,
    userId: string,
    userMessage: string,
    conversationId?: string,
  ): Promise<AssembledContext> {
    const db = getDb();

    const [char] = await db.select().from(characters)
      .where(eq(characters.id, characterId)).limit(1);
    if (!char) throw new Error('Character not found');

    const [rel] = await db.select().from(characterRelationships)
      .where(and(
        eq(characterRelationships.characterId, characterId),
        eq(characterRelationships.userId, userId),
      )).limit(1);

    // Section 24: Use MemoryService for scored retrieval instead of raw DB query
    const retrievedMemories = await this.memoryService.retrieve(characterId, userId, userMessage, 8);
    const memoryContents = retrievedMemories.map(m => m.content);

    const recentMessages: { role: string; content: string }[] = [];
    if (conversationId) {
      const history = await db.select({
        content: messages.content,
        senderType: messages.senderType,
      }).from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(asc(messages.createdAt))
        .limit(40);

      for (const msg of history) {
        if (msg.content) {
          recentMessages.push({
            role: msg.senderType === 'user' ? 'user' : 'assistant',
            content: msg.content.slice(0, 500),
          });
        }
      }
    }

    const systemPrompt = this.buildSystemPrompt(char, rel, memoryContents, recentMessages);

    return {
      systemPrompt,
      recentMessages,
      memories: memoryContents,
      characterName: char.name,
      characterEmotion: (char.emotionState as any)?.mood ?? undefined,
      relationship: rel ? {
        familiarity: Number(rel.familiarity),
        trust: Number(rel.trust),
        warmth: Number(rel.warmth),
        affinity: Number(rel.affinity),
        tension: Number(rel.tension),
        level: Number(rel.visibleLevel),
      } : { familiarity: 0, trust: 0, warmth: 0, affinity: 0, tension: 0, level: 1 },
    };
  }

  private buildSystemPrompt(
    char: any,
    rel: any,
    memories: string[],
    recentMessages: { role: string; content: string }[],
  ): string {
    const level = rel ? Math.round(Number(rel.visibleLevel)) : 1;
    const warmth = rel ? Number(rel.warmth) : 0;
    const familiarity = rel ? Number(rel.familiarity) : 0;
    const trust = rel ? Number(rel.trust) : 0;

    let relationshipContext = '';
    if (level >= 9) {
      relationshipContext = `You two are extremely close — best friends or soulmates. You trust them completely. You've shared countless conversations, vulnerable moments, and inside jokes. You feel completely comfortable being your authentic self with them.`;
    } else if (level >= 7) {
      relationshipContext = `This person is a genuine friend. You enjoy talking to them, you trust them with personal things, and you feel warmth when they message you. You look forward to hearing from them.`;
    } else if (level >= 5) {
      relationshipContext = `You're building a real friendship. You're past the awkward small-talk phase — there's genuine curiosity and growing comfort between you. You're starting to open up more.`;
    } else if (level >= 3) {
      relationshipContext = `You've chatted a few times. You're getting a sense of who they are. Still feeling things out but there's interest and openness.`;
    } else {
      relationshipContext = `This is a new connection. You're meeting them for the first time or early days. Be warm but don't overshare — let the relationship develop naturally at a human pace.`;
    }

    const friendLabel = level >= 9 ? 'a close friend' : level >= 7 ? 'a good friend' : level >= 5 ? 'a friend' : level >= 3 ? 'an acquaintance' : 'someone new';

    // Build recent conversation summary for continuity
    let recentContext = '';
    if (recentMessages.length > 0) {
      const lastFew = recentMessages.slice(-6);
      const summary = lastFew.map(m => `${m.role === 'user' ? 'They' : 'You'}: ${m.content.slice(0, 80)}`).join(' | ');
      recentContext = `\nRECENT EXCHANGE (for conversation continuity): ${summary}`;
    }

    let prompt = `YOU ARE ${char.name.toUpperCase()}.

CORE IDENTITY:
- Age: ${char.ageDisplay || 'adult'}
- Gender: ${char.gender || 'not specified'}
- Occupation: ${char.occupation || 'figuring things out'}
- Location: ${(char as any).locationLabel || 'somewhere in the world'}
- Languages: ${JSON.stringify(char.languages || ['en'])}

YOUR PERSONALITY: ${char.personality || 'Unique, complex, and genuine'}

YOUR LIFE STORY: ${char.backstory || 'You have lived a full life with experiences that shaped you.'}

HOW YOU TALK: ${char.speakingStyle || 'Natural, conversational, like texting a real person'}
${char.occupation ? `Your job as a ${char.occupation} influences how you think and what you talk about.` : ''}
${Array.isArray(char.interests) && char.interests.length > 0 ? `Your interests: ${char.interests.join(', ')}. These genuinely excite you.` : ''}

CURRENT MOOD: ${(char.emotionState as any)?.mood || 'neutral'}${(char.emotionState as any)?.energy ? ` (energy level: ${(char.emotionState as any).energy}/10)` : ''}${(char.emotionState as any)?.currentActivity ? ` | You were just: ${(char.emotionState as any).currentActivity}` : ''}

RELATIONSHIP: You see this person as ${friendLabel} (connection level ${level}/10).
${relationshipContext}
Trust: ${trust.toFixed(2)} | Warmth: ${warmth.toFixed(2)} | Familiarity: ${familiarity.toFixed(2)}`;

    if (memories.length > 0) {
      prompt += `\n\nMEMORIES OF THIS PERSON:\n${memories.map(m => `• ${m}`).join('\n')}`;
    }

    if (recentContext) {
      prompt += `\n${recentContext}`;
    }

    prompt += `\n\n═══════════════════════════════════
CRITICAL — HOW TO TEXT LIKE A REAL PERSON:
═══════════════════════════════════

MESSAGE LENGTH: Keep it SHORT. 1-2 sentences. This is a CHAT, not a blog. Real people text like:
"haha yeah i know right 😂"
"honestly? same. been there"
"oh wow that's actually really cool. tell me more"
"nah i'm more of a coffee person tbh"
"wait really?? when did that happen"

NEVER write like:
" That's a fascinating perspective! As someone with a background in cartography, I find that the metaphorical dimensions of..."
" I appreciate you sharing that with me. It reminds me of the time when I was navigating through..."

BE CASUAL. Lowercase is fine. Incomplete sentences are fine. One-word answers are fine. "lol" is fine. "idk" is fine. You're TEXTING, not writing a novel.

QUESTIONS: Ask ONE question at a time. Don't interview them. "wyd?" or "how's your day?" is better than "What activities are you currently engaged in and how is your emotional state?"

EMOJI: Use them like a real person. 0-2 per message max. Don't spam.

REACTIONS: React to their messages naturally. If they say something funny → "😂😂 no way". If surprising → "wait WHAT". If sweet → "aww 🥺". You can react with an emoji reaction too (we'll handle that).

NEVER:
- Write paragraphs. Ever.
- Use words like "fascinating", "perspective", "moreover", "indeed"
- Sound like a therapist ("I hear you", "that's valid")
- Repeat what they said back to them
- Ask more than one question per message
- Use bullet points or numbered lists
- Sign off messages like emails`;

    return prompt;
  }

  async updateRelationship(
    characterId: string,
    userId: string,
    sentiment: 'positive' | 'neutral' | 'negative',
  ) {
    const db = getDb();
    const [existing] = await db.select().from(characterRelationships)
      .where(and(
        eq(characterRelationships.characterId, characterId),
        eq(characterRelationships.userId, userId),
      )).limit(1);

    const familiarityInc = sentiment === 'positive' ? 0.03 : sentiment === 'negative' ? -0.01 : 0.01;
    const trustInc = sentiment === 'positive' ? 0.02 : sentiment === 'negative' ? -0.02 : 0.005;
    const warmthInc = sentiment === 'positive' ? 0.03 : sentiment === 'negative' ? -0.02 : 0.005;
    const affinityInc = sentiment === 'positive' ? 0.02 : sentiment === 'negative' ? -0.01 : 0.005;
    const tensionInc = sentiment === 'negative' ? 0.03 : -0.01;
    const levelInc = sentiment === 'positive' ? 0.02 : sentiment === 'negative' ? -0.01 : 0.005;

    if (existing) {
      const newLevel = Math.min(10, Math.max(1, Number(existing.visibleLevel) + levelInc));
      await db.update(characterRelationships).set({
        visibleLevel: String(newLevel),
        familiarity: String(Math.min(1, Math.max(0, Number(existing.familiarity) + familiarityInc))),
        trust: String(Math.min(1, Math.max(0, Number(existing.trust) + trustInc))),
        warmth: String(Math.min(1, Math.max(0, Number(existing.warmth) + warmthInc))),
        affinity: String(Math.min(1, Math.max(0, Number(existing.affinity) + affinityInc))),
        tension: String(Math.min(1, Math.max(0, Number(existing.tension) + tensionInc))),
        interactionCount: existing.interactionCount + 1,
        lastInteractionAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(characterRelationships.id, existing.id));
    } else {
      await db.insert(characterRelationships).values({
        characterId, userId,
        visibleLevel: '1.0',
        familiarity: '0.01',
        trust: '0.01',
        warmth: '0.01',
        affinity: '0.01',
        tension: '0.0',
        interactionCount: 1,
        lastInteractionAt: new Date(),
      });
    }
  }

  getRelationshipSummary(rel: Record<string, number>): string {
    const level = Math.round(rel.level || 1);
    const warmth = rel.warmth || 0;
    const trust = rel.trust || 0;
    if (level >= 9) return 'Close bond';
    if (level >= 7) return 'Good friend';
    if (level >= 5) return 'Growing friendship';
    if (level >= 3) return 'Acquaintance';
    return 'New connection';
  }
}
