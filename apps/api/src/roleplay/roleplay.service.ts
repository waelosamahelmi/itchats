import { Injectable, Logger } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characters, characterRelationships } from '@itchats/database/schema';
import { eq, and } from 'drizzle-orm';
import { alibabaChat } from '@itchats/ai-core';

@Injectable()
export class RoleplayService {
  private readonly logger = new Logger(RoleplayService.name);

  async getStatus(characterId: string, userId: string) {
    const db = getDb();
    const [char] = await db
      .select()
      .from(characters)
      .where(eq(characters.id, characterId))
      .limit(1);
    if (!char) return { available: false, reason: 'Character not found' };

    if (char.isRoleplayAvailable) {
      return { available: true };
    }

    // Get relationship
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

    const level = rel ? Math.round(Number(rel.visibleLevel)) : 1;
    const trust = rel ? Number(rel.trust) : 0;
    const warmth = rel ? Number(rel.warmth) : 0;
    const mood = char.mood || 'neutral';

    // Quick initial check (before LLM call)
    if (level < 3) {
      return { available: false, reason: 'You need to build more trust first' };
    }

    // Ask character via LLM
    const decision = await this.askCharacterAboutRoleplay(char, level, trust, warmth, mood);

    return decision;
  }

  async requestRoleplay(characterId: string, userId: string) {
    const db = getDb();
    const [char] = await db
      .select()
      .from(characters)
      .where(eq(characters.id, characterId))
      .limit(1);
    if (!char) throw new Error('Character not found');

    if (char.isRoleplayAvailable) {
      return {
        accepted: true,
        characterId,
        message: 'Roleplay session already active',
        characterName: char.name,
      };
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

    const level = rel ? Math.round(Number(rel.visibleLevel)) : 1;
    const trust = rel ? Number(rel.trust) : 0;
    const warmth = rel ? Number(rel.warmth) : 0;
    const mood = char.mood || 'neutral';
    const energy = (char.emotionState as any)?.energy ?? 5;

    if (level < 3) {
      return {
        accepted: false,
        characterId,
        message: 'You need to know each other better before roleplaying.',
      };
    }

    // Ask character via LLM
    const decision = await this.askCharacterAboutRoleplayRequest(
      char,
      level,
      trust,
      warmth,
      mood,
      energy,
    );

    if (decision.accepted) {
      await db
        .update(characters)
        .set({
          isRoleplayAvailable: true,
          roleplayAgreedAt: new Date(),
          roleplayLeftAt: null,
        } as any)
        .where(eq(characters.id, characterId));

      return {
        accepted: true,
        characterId,
        message: decision.message,
        characterName: char.name,
      };
    }

    return {
      accepted: false,
      characterId,
      message: decision.message,
      characterName: char.name,
    };
  }

  async leaveRoleplay(characterId: string) {
    const db = getDb();
    await db
      .update(characters)
      .set({
        isRoleplayAvailable: false,
        roleplayLeftAt: new Date(),
      } as any)
      .where(eq(characters.id, characterId));

    return { left: true, characterId };
  }

  private async askCharacterAboutRoleplay(
    char: any,
    level: number,
    trust: number,
    warmth: number,
    mood: string,
  ) {
    const prompt = `You are ${char.name}, a ${char.gender || 'person'} in your ${char.ageDisplay || 'prime'}.
Personality: ${char.personality || ''}
Description: ${char.description || ''}
Current mood: ${mood}
Your relationship level with this person: ${level}/10
Trust: ${Math.round(trust * 100)}%
Warmth: ${Math.round(warmth * 100)}%

Someone wants to check if you're available for roleplay. You should respond naturally as yourself.

Are you currently in the mood for roleplay? Consider your mood, how well you know them, trust level.

Return ONLY JSON:
{
  "available": true/false,
  "reason": "brief explanation in your voice (max 100 chars)"
}`;

    try {
      const result = await alibabaChat({
        messages: [{ role: 'user', content: prompt }],
        model: 'qwen-flash',
        temperature: 0.7,
        maxTokens: 150,
      });

      const cleaned = result.content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      const json = JSON.parse(cleaned);
      return {
        available: json.available === true,
        reason: typeof json.reason === 'string' ? json.reason : undefined,
      };
    } catch {
      return { available: false, reason: "I'm not sure right now." };
    }
  }

  private async askCharacterAboutRoleplayRequest(
    char: any,
    level: number,
    trust: number,
    warmth: number,
    mood: string,
    energy: number,
  ) {
    const prompt = `You are ${char.name}, a ${char.gender || 'person'} in your ${char.ageDisplay || 'prime'}.
Personality: ${char.personality || ''}
Description: ${char.description || ''}
Current mood: ${mood}
Energy level: ${energy}/10
Your relationship level with this person: ${level}/10
Trust: ${Math.round(trust * 100)}%
Warmth: ${Math.round(warmth * 100)}%

Someone is asking if you want to roleplay with them. Respond naturally as yourself.
Consider: your mood, energy level, how much you trust them, whether this feels right.

Return ONLY JSON:
{
  "accepted": true/false,
  "message": "what you would say in response (in character, max 200 chars, natural conversation)"
}`;

    try {
      const result = await alibabaChat({
        messages: [{ role: 'user', content: prompt }],
        model: 'qwen-flash',
        temperature: 0.8,
        maxTokens: 250,
      });

      const cleaned = result.content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      const json = JSON.parse(cleaned);
      return {
        accepted: json.accepted === true,
        message: typeof json.message === 'string' ? json.message : 'Maybe another time.',
      };
    } catch {
      return { accepted: false, message: 'Sorry, not right now.' };
    }
  }
}
