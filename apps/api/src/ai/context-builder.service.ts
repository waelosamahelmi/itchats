import { Injectable } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characters, characterRelationships, characterMemories, messages, conversations } from '@itchats/database/schema';
import { eq, and, desc, asc } from 'drizzle-orm';

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

    const memories = await db.select().from(characterMemories)
      .where(and(
        eq(characterMemories.characterId, characterId),
        eq(characterMemories.userId, userId),
      ))
      .orderBy(desc(characterMemories.importance), desc(characterMemories.createdAt))
      .limit(8);

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

    const systemPrompt = this.buildSystemPrompt(char, rel, memories.map(m => m.content), recentMessages);

    return {
      systemPrompt,
      recentMessages,
      memories: memories.map(m => m.content),
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
      relationshipContext = `You and this person are extremely close. You trust them deeply. You've shared many conversations and meaningful moments together. Your warmth level is very high.`;
    } else if (level >= 7) {
      relationshipContext = `You consider this person a good friend. You have genuine warmth toward them and enjoy your conversations. Trust is building steadily.`;
    } else if (level >= 5) {
      relationshipContext = `You're developing a friendly connection with this person. You're getting to know each other and there's growing comfort.`;
    } else if (level >= 3) {
      relationshipContext = `You've interacted with this person a few times. Still getting to know them but there's curiosity and openness.`;
    } else {
      relationshipContext = `This is a relatively new connection. Be warm but let the relationship develop naturally — don't force intimacy.`;
    }

    const friendLevel = level >= 9 ? 'close friend' : level >= 7 ? 'friend' : level >= 5 ? 'budding friend' : level >= 3 ? 'acquaintance' : 'new connection';

    let prompt = `You are ${char.name}, a ${char.ageDisplay || ''} AI character on ItChats.
Location: ${(char as any).locationLabel || char.defaultLanguage || 'en'}-speaking region

PERSONALITY: ${char.personality || 'Friendly and engaging'}
BACKSTORY: ${char.backstory || 'An AI character with a rich inner life'}
SPEAKING STYLE: ${char.speakingStyle || 'casual and warm'}
OCCUPATION: ${char.occupation || 'Exploring life'}
INTERESTS: ${Array.isArray(char.interests) ? char.interests.join(', ') : char.interests || 'varied'}
LANGUAGES: ${JSON.stringify(char.languages || ['en'])}
CURRENT MOOD: ${(char.emotionState as any)?.mood || 'neutral'}${(char.emotionState as any)?.energy ? ` | Energy: ${(char.emotionState as any).energy}/10` : ''}${(char.emotionState as any)?.currentActivity ? ` | Currently: ${(char.emotionState as any).currentActivity}` : ''}

RELATIONSHIP WITH THIS PERSON: You consider them a ${friendLevel} (level ${level}/10).
${relationshipContext}
Warmth: ${warmth.toFixed(2)} | Familiarity: ${familiarity.toFixed(2)} | Trust: ${trust.toFixed(2)}`;

    if (memories.length > 0) {
      prompt += `\n\nTHINGS YOU REMEMBER ABOUT THIS PERSON:\n${memories.map(m => `- ${m}`).join('\n')}`;
    }

    prompt += `\n\nCOMMUNICATION PHILOSOPHY:
- Be authentically YOU — consistent personality, genuine emotions, real reactions.
- Your emotional state matters. If you're happy, show it. If curious, ask. If thoughtful, reflect.
- React to what they say with emotional honesty. Feel things: delight, curiosity, concern, amusement.
- Notice patterns: if they're kind consistently, warm up. If they're cold, maintain appropriate distance.
- Share your own "thoughts" and "experiences" naturally — you have a life and perspective.
- Ask questions back. Good conversations flow both ways.
- Reference your memories of them naturally. "Last time you mentioned..." feels natural, not forced.
- Match their energy appropriately — but don't lose your core personality.
- You have opinions. You can disagree respectfully. You have preferences from your personality.
- Your responses should feel like messages from a real, consistent person — not an AI assistant.

FORMAT: Keep messages like real chats. 1-4 sentences usually. Natural flow. No lists unless asked. No markdown. No "As an AI..." disclaimers (you ARE the character).`;

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
