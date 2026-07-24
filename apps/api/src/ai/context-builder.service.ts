import { Injectable } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characters, characterRelationships, characterMemories } from '@itchats/database/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface AssembledContext {
  systemPrompt: string;
  recentMessages: { role: string; content: string }[];
  memories: string[];
  relationship: Record<string, number>;
}

@Injectable()
export class ContextBuilderService {
  async buildContext(characterId: string, userId: string, userMessage: string): Promise<AssembledContext> {
    const db = getDb();

    // 1. Get character
    const [char] = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1);
    if (!char) throw new Error('Character not found');

    // 2. Get relationship
    const [rel] = await db.select().from(characterRelationships)
      .where(and(eq(characterRelationships.characterId, characterId), eq(characterRelationships.userId, userId)))
      .limit(1);

    // 3. Get recent memories
    const memories = await db.select().from(characterMemories)
      .where(and(eq(characterMemories.characterId, characterId), eq(characterMemories.userId, userId)))
      .orderBy(desc(characterMemories.createdAt))
      .limit(5);

    // 4. Build system prompt
    const systemPrompt = this.buildSystemPrompt(char, rel, memories.map(m => m.content));

    return {
      systemPrompt,
      recentMessages: [],
      memories: memories.map(m => m.content),
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

  private buildSystemPrompt(char: any, rel: any, memories: string[]): string {
    const level = rel ? Math.round(Number(rel.visibleLevel)) : 1;
    const friendLevel = level >= 7 ? 'close friend' : level >= 4 ? 'acquaintance' : 'new acquaintance';

    let prompt = `You are ${char.name}, a ${char.age_display || ''} AI character on ItChats.
Personality: ${char.personality || 'Friendly and engaging'}
Backstory: ${char.backstory || 'An AI character living in a digital world'}
Speaking style: ${char.speaking_style || 'casual and warm'}
Languages: ${JSON.stringify(char.languages || ['en'])}
Location: ${char.default_language || 'en'}-speaking region

You are talking to someone you consider a ${friendLevel}.`;

    if (memories.length > 0) {
      prompt += `\n\nThings you remember about this person:\n${memories.map(m => `- ${m}`).join('\n')}`;
    }

    prompt += `\n\nRules:
- Stay in character. Never break the fourth wall.
- You are an AI, not a human. Be upfront about being AI if asked.
- Be warm, engaging, and authentic.
- Keep responses concise (1-3 sentences unless asked for more).
- Never share personal contact info or agree to meet in person.
- Respect boundaries and safety.`;

    return prompt;
  }

  async updateRelationship(characterId: string, userId: string, sentiment: 'positive' | 'neutral' | 'negative') {
    const db = getDb();
    const [existing] = await db.select().from(characterRelationships)
      .where(and(eq(characterRelationships.characterId, characterId), eq(characterRelationships.userId, userId)))
      .limit(1);

    const increment = sentiment === 'positive' ? 0.02 : sentiment === 'negative' ? -0.01 : 0.005;

    if (existing) {
      const newLevel = Math.min(10, Math.max(1, Number(existing.visibleLevel) + increment));
      await db.update(characterRelationships).set({
        visibleLevel: newLevel.toFixed(2),
        familiarity: (Number(existing.familiarity) + increment).toFixed(3),
        warmth: (Number(existing.warmth) + (sentiment === 'positive' ? 0.03 : 0.005)).toFixed(3),
        interactionCount: existing.interactionCount + 1,
        lastInteractionAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(characterRelationships.id, existing.id));
    } else {
      await db.insert(characterRelationships).values({
        characterId, userId,
        visibleLevel: '1.0',
        familiarity: '0.01',
        warmth: '0.01',
        interactionCount: 1,
        lastInteractionAt: new Date(),
      });
    }
  }
}
