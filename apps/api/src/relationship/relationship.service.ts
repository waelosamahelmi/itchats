import { Injectable, Logger } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characterRelationships, characters } from '@itchats/database/schema';
import { eq, and, sql } from 'drizzle-orm';
import { alibabaChat } from '@itchats/ai-core';

interface RelationshipDelta {
  familiarity: number;
  trust: number;
  warmth: number;
  affinity: number;
  tension: number;
  comfort: number;
  attachment: number;
  chemistry: number;
  romance: number;
  humor: number;
  respect: number;
  levelDelta: number;
  summary: string;
}

@Injectable()
export class RelationshipService {
  private readonly logger = new Logger(RelationshipService.name);

  /**
   * Process relationship delta after each chat message exchange.
   */
  async processInteractionDelta(
    characterId: string,
    userId: string,
    conversationContext: string,
  ) {
    const db = getDb();

    const [char] = await db
      .select()
      .from(characters)
      .where(eq(characters.id, characterId))
      .limit(1);
    if (!char) return;

    const [existing] = await db
      .select()
      .from(characterRelationships)
      .where(
        and(
          eq(characterRelationships.characterId, characterId),
          eq(characterRelationships.userId, userId),
        ),
      )
      .limit(1);

    const currentLevel = existing ? Math.round(Number(existing.visibleLevel)) : 1;
    const currentLabel = this.getRelationshipLabel(currentLevel);

    // Ask LLM to evaluate the interaction
    const delta = await this.evaluateInteraction(
      char.name,
      char.personality || '',
      currentLabel,
      conversationContext,
    );

    // Apply delta to relationship
    if (existing) {
      const newLevel = Math.min(10, Math.max(1, currentLevel + delta.levelDelta));
      const newFamiliarity = this.clamp(Number(existing.familiarity) + delta.familiarity);
      const newTrust = this.clamp(Number(existing.trust) + delta.trust);
      const newWarmth = this.clamp(Number(existing.warmth) + delta.warmth);
      const newAffinity = this.clamp(Number(existing.affinity) + delta.affinity);
      const newTension = this.clamp(Number(existing.tension) + delta.tension);
      const newComfort = this.clamp(Number(existing.comfort) + delta.comfort);
      const newAttachment = this.clamp(Number(existing.attachment) + delta.attachment);
      const newChemistry = this.clamp(Number(existing.chemistry) + delta.chemistry);
      const newRomance = this.clamp(Number(existing.romance) + delta.romance);
      const newHumor = this.clamp(Number(existing.humor) + delta.humor);
      const newRespect = this.clamp(Number(existing.respect) + delta.respect);

      await db
        .update(characterRelationships)
        .set({
          visibleLevel: String(newLevel),
          familiarity: String(newFamiliarity),
          trust: String(newTrust),
          warmth: String(newWarmth),
          affinity: String(newAffinity),
          tension: String(newTension),
          comfort: String(newComfort),
          attachment: String(newAttachment),
          chemistry: String(newChemistry),
          romance: String(newRomance),
          humor: String(newHumor),
          respect: String(newRespect),
          interactionCount: existing.interactionCount + 1,
          lastInteractionAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .where(eq(characterRelationships.id, existing.id));

      // Check for level up
      if (newLevel > currentLevel) {
        this.logger.log(
          `Relationship leveled up: ${char.name} + ${userId} from ${currentLabel} to ${this.getRelationshipLabel(newLevel)}`,
        );
      }
    } else {
      // Create initial relationship
      const baseVal = String(0.01 + delta.familiarity);
      await db.insert(characterRelationships).values({
        characterId,
        userId,
        visibleLevel: '1.0',
        familiarity: String(this.clamp(0.01 + delta.familiarity)),
        trust: String(this.clamp(0.01 + delta.trust)),
        warmth: String(this.clamp(0.01 + delta.warmth)),
        affinity: String(this.clamp(0.01 + delta.affinity)),
        tension: String(this.clamp(delta.tension)),
        comfort: String(this.clamp(0.01 + delta.comfort)),
        attachment: String(this.clamp(delta.attachment)),
        chemistry: String(this.clamp(delta.chemistry)),
        romance: String(this.clamp(delta.romance)),
        humor: String(this.clamp(delta.humor)),
        respect: String(this.clamp(0.01 + delta.respect)),
        curiosity: '0.01',
        compatibility: '0.01',
        interactionCount: 1,
        conversationCount: 1,
        daysKnown: 1,
        lastInteractionAt: new Date(),
      } as any);
    }
  }

  async getRelationship(characterId: string, userId: string) {
    const db = getDb();
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

    if (!rel) {
      return {
        level: 1,
        label: 'Stranger',
        familiarity: 0,
        trust: 0,
        warmth: 0,
        affinity: 0,
        tension: 0,
        comfort: 0,
        attachment: 0,
        chemistry: 0,
        romance: 0,
        humor: 0,
        respect: 0,
        interactionCount: 0,
      };
    }

    const level = Math.round(Number(rel.visibleLevel) || 1);
    return {
      level,
      label: this.getRelationshipLabel(level),
      familiarity: Number(rel.familiarity) || 0,
      trust: Number(rel.trust) || 0,
      warmth: Number(rel.warmth) || 0,
      affinity: Number(rel.affinity) || 0,
      tension: Number(rel.tension) || 0,
      comfort: Number(rel.comfort) || 0,
      attachment: Number(rel.attachment) || 0,
      chemistry: Number(rel.chemistry) || 0,
      romance: Number(rel.romance) || 0,
      humor: Number(rel.humor) || 0,
      respect: Number(rel.respect) || 0,
      interactionCount: rel.interactionCount,
    };
  }

  async getRelationshipHistory(characterId: string, userId: string) {
    const db = getDb();
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

    if (!rel) return { history: [] };

    return {
      currentLevel: Math.round(Number(rel.visibleLevel) || 1),
      currentLabel: this.getRelationshipLabel(Math.round(Number(rel.visibleLevel) || 1)),
      interactionCount: rel.interactionCount,
      daysKnown: rel.daysKnown,
      conversationCount: rel.conversationCount,
      familiarity: Number(rel.familiarity) || 0,
      trust: Number(rel.trust) || 0,
      warmth: Number(rel.warmth) || 0,
      affinity: Number(rel.affinity) || 0,
      createdAt: rel.createdAt,
      updatedAt: rel.updatedAt,
    };
  }

  async checkLevelUp(characterId: string, userId: string) {
    const db = getDb();
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

    if (!rel) return null;

    const level = Math.round(Number(rel.visibleLevel) || 1);
    const label = this.getRelationshipLabel(level);

    // Check for milestone levels
    const milestones = [2, 3, 4, 5, 6, 7, 8, 9, 10];
    const milestoneLabels: Record<number, string> = {
      2: 'New Connection',
      3: 'Familiar Face',
      4: 'Acquaintance',
      5: 'Budding Friend',
      6: 'Friend',
      7: 'Good Friend',
      8: 'Close Friend',
      9: 'Best Friend',
      10: 'Soulmate',
    };

    if (milestones.includes(level) && rel.interactionCount > 0) {
      return {
        leveledUp: true,
        level,
        label: milestoneLabels[level] || label,
        characterId,
        userId,
      };
    }

    return null;
  }

  private async evaluateInteraction(
    characterName: string,
    personality: string,
    currentLabel: string,
    conversationContext: string,
  ): Promise<RelationshipDelta> {
    const prompt = `You are evaluating a conversation interaction for relationship scoring.

Character: ${characterName}
Personality: ${personality}
Current relationship: ${currentLabel}

Conversation context:
${conversationContext.slice(0, 800)}

Evaluate this interaction. How does it affect the relationship between the character and the human?
Rate each dimension from -0.1 to +0.1 (small changes per message).

Return ONLY JSON (no markdown):
{
  "familiarity": -0.1 to 0.1,
  "trust": -0.1 to 0.1,
  "warmth": -0.1 to 0.1,
  "affinity": -0.1 to 0.1,
  "tension": -0.1 to 0.1,
  "comfort": -0.1 to 0.1,
  "attachment": -0.1 to 0.1,
  "chemistry": -0.1 to 0.1,
  "romance": -0.1 to 0.1,
  "humor": -0.1 to 0.1,
  "respect": -0.1 to 0.1,
  "levelDelta": 0 (0=no change, 0.02=small positive, -0.01=small negative),
  "summary": "one sentence explaining the change"
}`;

    try {
      const result = await alibabaChat({
        messages: [{ role: 'user', content: prompt }],
        model: 'qwen-flash',
        temperature: 0.3,
        maxTokens: 300,
      });

      const cleaned = result.content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      const json = JSON.parse(cleaned);

      return {
        familiarity: this.bound(json.familiarity, -0.1, 0.1),
        trust: this.bound(json.trust, -0.1, 0.1),
        warmth: this.bound(json.warmth, -0.1, 0.1),
        affinity: this.bound(json.affinity, -0.1, 0.1),
        tension: this.bound(json.tension, -0.1, 0.1),
        comfort: this.bound(json.comfort, -0.1, 0.1),
        attachment: this.bound(json.attachment, -0.1, 0.1),
        chemistry: this.bound(json.chemistry, -0.1, 0.1),
        romance: this.bound(json.romance, -0.1, 0.1),
        humor: this.bound(json.humor, -0.1, 0.1),
        respect: this.bound(json.respect, -0.1, 0.1),
        levelDelta: this.bound(json.levelDelta, -0.05, 0.05),
        summary: typeof json.summary === 'string' ? json.summary : '',
      };
    } catch {
      // Default to very small positive for continued interaction
      return {
        familiarity: 0.01,
        trust: 0.005,
        warmth: 0.005,
        affinity: 0.005,
        tension: -0.005,
        comfort: 0.005,
        attachment: 0.002,
        chemistry: 0.002,
        romance: 0,
        humor: 0.002,
        respect: 0.002,
        levelDelta: 0.002,
        summary: 'Continued interaction',
      };
    }
  }

  private clamp(value: number): number {
    return Math.min(1, Math.max(0, value));
  }

  private bound(value: any, min: number, max: number): number {
    const n = Number(value);
    if (isNaN(n)) return 0;
    return Math.min(max, Math.max(min, n));
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
