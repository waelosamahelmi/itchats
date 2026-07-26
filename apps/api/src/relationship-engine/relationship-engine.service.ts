import { Injectable, Logger } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characterRelationships, characters } from '@itchats/database/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Message quality dimensions scored by the relationship engine.
 */
export interface MessageScore {
  interest: number;    // 0-1: was the message interesting/engaging?
  humor: number;       // 0-1: did it show humor?
  empathy: number;     // 0-1: did it show emotional intelligence?
  memoryUsage: number; // 0-1: did it reference shared memories?
  quality: number;     // 0-1: overall conversation quality
  openness: number;    // 0-1: how open/vulnerable was the message?
  creativity: number;  // 0-1: creative/original thinking?
}

export interface RelationshipState {
  visibleLevel: number;    // 1-10 (computed, never stored directly)
  familiarity: number;     // 0-1
  trust: number;           // 0-1
  warmth: number;          // 0-1
  affinity: number;        // 0-1
  tension: number;         // 0-1
  comfort: number;         // 0-1
  attachment: number;      // 0-1
  curiosity: number;       // 0-1
  respect: number;         // 0-1
  chemistry: number;       // 0-1
  romance: number;         // 0-1
  humor: number;           // 0-1 (shared humor)
  compatibility: number;   // 0-1
  interactionCount: number;
  conversationCount: number;
  daysKnown: number;
}

/**
 * Relationship Engine
 *
 * Replaces simple "+5 relationship" counters with multidimensional scoring.
 * Every message is evaluated across multiple dimensions, and relationships
 * evolve naturally based on interaction quality rather than quantity.
 *
 * visibleLevel is COMPUTED from the dimensional scores — never stored directly.
 */
@Injectable()
export class RelationshipEngineService {
  private readonly logger = new Logger(RelationshipEngineService.name);

  /** Decay rate: how much attachment/affection fades per day of no contact */
  private readonly DECAY_RATE = 0.003;
  /** Days before decay starts */
  private readonly DECAY_GRACE_DAYS = 3;
  /** Conflict recovery rate per interaction */
  private readonly CONFLICT_RECOVERY = 0.05;
  /** Forgiveness threshold: if trust drops below this, trigger forgiveness mechanics */
  private readonly FORGIVENESS_THRESHOLD = 0.3;

  /**
   * Score a message exchange and update the relationship.
   * Called after every user→character or character→user message.
   */
  async scoreAndUpdate(
    characterId: string,
    userId: string,
    userMessage: string,
    aiResponse: string,
  ): Promise<RelationshipState> {
    const score = this.scoreMessage(userMessage, aiResponse);
    return this.updateRelationship(characterId, userId, score);
  }

  /**
   * Score a single message exchange across multiple dimensions.
   * Uses heuristics + text analysis for MVP; future: LLM-based scoring.
   */
  scoreMessage(userMessage: string, aiResponse: string): MessageScore {
    const combined = (userMessage + ' ' + aiResponse).toLowerCase();

    // Interest: message length, question marks, exclamation marks
    const msgLen = combined.length;
    const questionCount = (combined.match(/\?/g) || []).length;
    const exclaimCount = (combined.match(/!/g) || []).length;
    const interest = Math.min(1, (msgLen / 500) * 0.4 + (questionCount / 3) * 0.3 + (exclaimCount / 3) * 0.3);

    // Humor: laughter indicators, slang, emojis
    const humorKeywords = ['😂', 'lol', 'lmao', 'haha', 'funny', 'joke', '💀', '🤣', 'lmaoo', 'hehe', 'rofl'];
    const humorMatches = humorKeywords.filter(k => combined.includes(k)).length;
    const humor = Math.min(1, humorMatches / 4);

    // Empathy: emotional words, supportive language
    const empathyKeywords = ['feel', 'understand', 'sorry', 'that sucks', 'i know', 'same', 'aww', '🥺', '❤️', 'hug', 'here for you', 'that must be', 'i get it'];
    const empathyMatches = empathyKeywords.filter(k => combined.includes(k)).length;
    const empathy = Math.min(1, empathyMatches / 4);

    // Memory usage: references to past, "remember", names
    const memoryKeywords = ['remember', 'last time', 'before', 'you said', 'you told me', 'like that time', 'as always'];
    const memoryMatches = memoryKeywords.filter(k => combined.includes(k)).length;
    const memoryUsage = Math.min(1, memoryMatches / 3);

    // Openness: self-disclosure indicators
    const opennessKeywords = ['honestly', 'tbh', 'ngl', 'actually', 'i feel', 'i think', 'personally', 'to be honest', 'real talk'];
    const opennessMatches = opennessKeywords.filter(k => combined.includes(k)).length;
    const openness = Math.min(1, opennessMatches / 3);

    // Creativity: unique/novel expressions
    const creativity = Math.min(1, (msgLen > 100 ? 0.5 : 0) + (questionCount > 1 ? 0.3 : 0) + (exclaimCount > 1 ? 0.2 : 0));

    // Overall quality: weighted average
    const quality = interest * 0.25 + humor * 0.15 + empathy * 0.20 + memoryUsage * 0.15 + openness * 0.15 + creativity * 0.10;

    return { interest, humor, empathy, memoryUsage, quality, openness, creativity };
  }

  /**
   * Update relationship based on scored interaction.
   * Each dimension shifts subtly per interaction — relationships grow slowly over many quality exchanges.
   */
  async updateRelationship(
    characterId: string,
    userId: string,
    score: MessageScore,
  ): Promise<RelationshipState> {
    const db = getDb();
    const [existing] = await db.select().from(characterRelationships)
      .where(and(
        eq(characterRelationships.characterId, characterId),
        eq(characterRelationships.userId, userId),
      )).limit(1);

    if (!existing) {
      // First interaction — seed relationship
      const state = this.seedRelationship(score);
      await db.insert(characterRelationships).values({
        characterId,
        userId,
        visibleLevel: String(state.visibleLevel),
        familiarity: String(state.familiarity),
        trust: String(state.trust),
        warmth: String(state.warmth),
        affinity: String(state.affinity),
        tension: String(state.tension),
        comfort: String(state.comfort),
        attachment: String(state.attachment),
        curiosity: String(state.curiosity),
        respect: String(state.respect),
        chemistry: String(state.chemistry),
        romance: String(state.romance),
        humor: String(state.humor),
        compatibility: String(state.compatibility),
        interactionCount: 1,
        conversationCount: 1,
        daysKnown: 1,
        lastInteractionAt: new Date(),
      } as any);
      return state;
    }

    // Apply decay since last interaction
    const decayed = this.applyDecay(existing);
    const now = new Date();
    const daysSinceCreation = Math.max(1, Math.floor((now.getTime() - new Date(existing.createdAt).getTime()) / 86400000));
    const isNewConversation = !existing.lastInteractionAt ||
      (now.getTime() - new Date(existing.lastInteractionAt).getTime()) > 3600000; // >1hr = new convo

    // Calculate deltas based on message quality
    const qualityModifier = score.quality; // 0-1 multiplier
    const baseShift = 0.01 * qualityModifier; // Small shifts per interaction

    // Get current values, defaulting to 0
    const d = {
      familiarity: decayed.familiarity ?? 0,
      trust: decayed.trust ?? 0,
      warmth: decayed.warmth ?? 0,
      affinity: decayed.affinity ?? 0,
      tension: decayed.tension ?? 0,
      comfort: decayed.comfort ?? 0,
      attachment: decayed.attachment ?? 0,
      curiosity: decayed.curiosity ?? 0,
      respect: decayed.respect ?? 0,
      chemistry: decayed.chemistry ?? 0,
      romance: decayed.romance ?? 0,
      humor: decayed.humor ?? 0,
      compatibility: decayed.compatibility ?? 0,
    };

    const newState: Record<string, number> = {
      familiarity: this.clamp(d.familiarity + baseShift * 1.5),
      trust: this.clamp(d.trust + baseShift * (1.0 + score.empathy * 0.5)),
      warmth: this.clamp(d.warmth + baseShift * (1.0 + score.empathy * 0.4 + score.humor * 0.3)),
      affinity: this.clamp(d.affinity + baseShift * (1.0 + score.interest * 0.3)),
      tension: this.clamp(Math.max(0, d.tension - baseShift * 0.5)),
      comfort: this.clamp(d.comfort + baseShift * (1.0 + score.openness * 0.5)),
      attachment: this.clamp(d.attachment + baseShift * (1.0 + score.memoryUsage * 0.4)),
      curiosity: this.clamp(d.curiosity + baseShift * (1.0 + score.creativity * 0.3)),
      respect: this.clamp(d.respect + baseShift * (1.0 + score.empathy * 0.3)),
      chemistry: this.clamp(d.chemistry + baseShift * (1.0 + score.humor * 0.4 + score.interest * 0.3)),
      romance: this.clamp(d.romance + baseShift * (score.openness * 0.5 + score.empathy * 0.3)),
      humor: this.clamp(d.humor + baseShift * (score.humor * 0.8)),
      compatibility: this.clamp(d.compatibility + baseShift * (score.quality * 0.5)),
    };

    // Calculate visible level from dimensional scores
    const visibleLevel = this.calculateVisibleLevel(newState);

    // Persist
    await db.update(characterRelationships).set({
      visibleLevel: String(visibleLevel),
      familiarity: String(newState.familiarity),
      trust: String(newState.trust),
      warmth: String(newState.warmth),
      affinity: String(newState.affinity),
      tension: String(newState.tension),
      comfort: String(newState.comfort),
      attachment: String(newState.attachment),
      curiosity: String(newState.curiosity),
      respect: String(newState.respect),
      chemistry: String(newState.chemistry),
      romance: String(newState.romance),
      humor: String(newState.humor),
      compatibility: String(newState.compatibility),
      interactionCount: existing.interactionCount + 1,
      conversationCount: isNewConversation ? existing.conversationCount + 1 : existing.conversationCount,
      daysKnown: daysSinceCreation,
      lastInteractionAt: now,
      updatedAt: now,
    } as any).where(eq(characterRelationships.id, existing.id));

    return {
      visibleLevel,
      familiarity: newState.familiarity ?? 0,
      trust: newState.trust ?? 0,
      warmth: newState.warmth ?? 0,
      affinity: newState.affinity ?? 0,
      tension: newState.tension ?? 0,
      comfort: newState.comfort ?? 0,
      attachment: newState.attachment ?? 0,
      curiosity: newState.curiosity ?? 0,
      respect: newState.respect ?? 0,
      chemistry: newState.chemistry ?? 0,
      romance: newState.romance ?? 0,
      humor: newState.humor ?? 0,
      compatibility: newState.compatibility ?? 0,
      interactionCount: existing.interactionCount + 1,
      conversationCount: isNewConversation ? existing.conversationCount + 1 : existing.conversationCount,
      daysKnown: daysSinceCreation,
    };
  }

  /**
   * Calculate visible relationship level (1-10) from dimensional scores.
   * Weighted formula ensures relationships feel earned, not grinded.
   */
  calculateVisibleLevel(dims: Record<string, number>): number {
    const weights = {
      trust: 0.22,
      warmth: 0.16,
      comfort: 0.14,
      familiarity: 0.12,
      affinity: 0.10,
      attachment: 0.08,
      chemistry: 0.06,
      respect: 0.05,
      humor: 0.04,
      curiosity: 0.03,
    };

    let weightedSum = 0;
    let totalWeight = 0;
    for (const [dim, weight] of Object.entries(weights)) {
      const value = dims[dim] || 0;
      weightedSum += value * weight;
      totalWeight += weight;
    }

    const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Map 0-1 to 1-10 with non-linear progression
    // Lower levels are easier to reach; higher levels require significant investment
    if (rawScore < 0.1) return 1;
    if (rawScore < 0.2) return 2;
    if (rawScore < 0.3) return 3;
    if (rawScore < 0.45) return 4;
    if (rawScore < 0.55) return 5;
    if (rawScore < 0.65) return 6;
    if (rawScore < 0.75) return 7;
    if (rawScore < 0.85) return 8;
    if (rawScore < 0.95) return 9;
    return 10;
  }

  /** Decay state with all dimension keys guaranteed */
  private readonly DECAY_KEYS = ['familiarity','trust','warmth','affinity','tension','comfort','attachment','curiosity','respect','chemistry','romance','humor','compatibility'] as const;

  /**
   * Apply attachment decay for inactive relationships.
   * Comfort, attachment, warmth slowly fade without interaction.
   */
  private applyDecay(existing: any): Record<string, number> {
    const now = Date.now();
    const lastInteraction = existing.lastInteractionAt
      ? new Date(existing.lastInteractionAt).getTime()
      : new Date(existing.createdAt).getTime();
    const daysSince = (now - lastInteraction) / 86400000;

    if (daysSince <= this.DECAY_GRACE_DAYS) {
      return {
        familiarity: Number(existing.familiarity),
        trust: Number(existing.trust),
        warmth: Number(existing.warmth),
        affinity: Number(existing.affinity),
        tension: Number(existing.tension),
        comfort: Number(existing.comfort),
        attachment: Number(existing.attachment),
        curiosity: Number(existing.curiosity),
        respect: Number(existing.respect),
        chemistry: Number(existing.chemistry),
        romance: Number(existing.romance),
        humor: Number(existing.humor),
        compatibility: Number(existing.compatibility),
      };
    }

    const decayDays = daysSince - this.DECAY_GRACE_DAYS;
    const decayFactor = Math.min(0.5, decayDays * this.DECAY_RATE); // Cap at 50% decay

    return {
      familiarity: Math.max(0, Number(existing.familiarity) * (1 - decayFactor * 0.3)),
      trust: Math.max(0, Number(existing.trust) * (1 - decayFactor * 0.2)),
      warmth: Math.max(0, Number(existing.warmth) * (1 - decayFactor * 0.4)),
      affinity: Math.max(0, Number(existing.affinity) * (1 - decayFactor * 0.3)),
      tension: Math.max(0, Number(existing.tension) * (1 - decayFactor * 0.5)), // Tension decays faster
      comfort: Math.max(0, Number(existing.comfort) * (1 - decayFactor * 0.5)),
      attachment: Math.max(0, Number(existing.attachment) * (1 - decayFactor * 0.5)),
      curiosity: Math.max(0, Number(existing.curiosity) * (1 - decayFactor * 0.2)),
      respect: Number(existing.respect), // Respect doesn't decay
      chemistry: Math.max(0, Number(existing.chemistry) * (1 - decayFactor * 0.4)),
      romance: Math.max(0, Number(existing.romance) * (1 - decayFactor * 0.5)),
      humor: Math.max(0, Number(existing.humor) * (1 - decayFactor * 0.2)),
      compatibility: Math.max(0, Number(existing.compatibility) * (1 - decayFactor * 0.1)), // Compatibility stays
    };
  }

  /**
   * Record a conflict between user and character.
   * Increases tension, decreases trust and warmth temporarily.
   */
  async recordConflict(characterId: string, userId: string, severity: number = 0.5) {
    const db = getDb();
    const [rel] = await db.select().from(characterRelationships)
      .where(and(
        eq(characterRelationships.characterId, characterId),
        eq(characterRelationships.userId, userId),
      )).limit(1);
    if (!rel) return;

    const trustDrop = severity * 0.1;
    const warmthDrop = severity * 0.08;
    const tensionRise = severity * 0.15;

    await db.update(characterRelationships).set({
      trust: String(Math.max(0, Number(rel.trust) - trustDrop)),
      warmth: String(Math.max(0, Number(rel.warmth) - warmthDrop)),
      tension: String(Math.min(1, Number(rel.tension) + tensionRise)),
      lastConflict: new Date(),
      updatedAt: new Date(),
    } as any).where(eq(characterRelationships.id, rel.id));

    // Recalculate visible level
    const newDims = {
      trust: Math.max(0, Number(rel.trust) - trustDrop),
      warmth: Math.max(0, Number(rel.warmth) - warmthDrop),
      tension: Math.min(1, Number(rel.tension) + tensionRise),
      familiarity: Number(rel.familiarity),
      affinity: Number(rel.affinity),
      comfort: Number(rel.comfort),
      attachment: Number(rel.attachment),
      curiosity: Number(rel.curiosity),
      respect: Number(rel.respect),
      chemistry: Number(rel.chemistry),
      romance: Number(rel.romance),
      humor: Number(rel.humor),
      compatibility: Number(rel.compatibility),
    };
    const newLevel = this.calculateVisibleLevel(newDims);

    await db.update(characterRelationships).set({
      visibleLevel: String(newLevel),
    } as any).where(eq(characterRelationships.id, rel.id));
  }

  /**
   * Apply forgiveness — recover trust after conflict.
   */
  async forgive(characterId: string, userId: string) {
    const db = getDb();
    const [rel] = await db.select().from(characterRelationships)
      .where(and(
        eq(characterRelationships.characterId, characterId),
        eq(characterRelationships.userId, userId),
      )).limit(1);
    if (!rel || !rel.lastConflict) return;

    const daysSinceConflict = (Date.now() - new Date(rel.lastConflict).getTime()) / 86400000;
    const recoveryAmount = Math.min(0.15, daysSinceConflict * this.CONFLICT_RECOVERY);

    await db.update(characterRelationships).set({
      trust: String(Math.min(1, Number(rel.trust) + recoveryAmount)),
      tension: String(Math.max(0, Number(rel.tension) - recoveryAmount * 0.5)),
      updatedAt: new Date(),
    } as any).where(eq(characterRelationships.id, rel.id));
  }

  /**
   * Get the current relationship state for display.
   */
  async getRelationship(characterId: string, userId: string): Promise<RelationshipState | null> {
    const db = getDb();
    const [rel] = await db.select().from(characterRelationships)
      .where(and(
        eq(characterRelationships.characterId, characterId),
        eq(characterRelationships.userId, userId),
      )).limit(1);
    if (!rel) return null;

    const decayed = this.applyDecay(rel);
    const level = this.calculateVisibleLevel(decayed);

    return {
      visibleLevel: level,
      familiarity: decayed.familiarity ?? 0,
      trust: decayed.trust ?? 0,
      warmth: decayed.warmth ?? 0,
      affinity: decayed.affinity ?? 0,
      tension: decayed.tension ?? 0,
      comfort: decayed.comfort ?? 0,
      attachment: decayed.attachment ?? 0,
      curiosity: decayed.curiosity ?? 0,
      respect: decayed.respect ?? 0,
      chemistry: decayed.chemistry ?? 0,
      romance: decayed.romance ?? 0,
      humor: decayed.humor ?? 0,
      compatibility: decayed.compatibility ?? 0,
      interactionCount: rel.interactionCount,
      conversationCount: rel.conversationCount,
      daysKnown: Math.floor((Date.now() - new Date(rel.createdAt).getTime()) / 86400000),
    };
  }

  /**
   * Get relationship label for UI display.
   */
  getRelationshipLabel(state: RelationshipState | null): string {
    if (!state) return 'Stranger';
    const lvl = state.visibleLevel;
    if (lvl >= 10) return 'Soulmate';
    if (lvl >= 9) return 'Best Friend';
    if (lvl >= 8) return 'Close Friend';
    if (lvl >= 7) return 'Good Friend';
    if (lvl >= 6) return 'Friend';
    if (lvl >= 5) return 'Budding Friend';
    if (lvl >= 4) return 'Acquaintance';
    if (lvl >= 3) return 'Familiar Face';
    if (lvl >= 2) return 'New Connection';
    return 'Stranger';
  }

  private seedRelationship(score: MessageScore): RelationshipState {
    const base = 0.05 * score.quality;
    return {
      visibleLevel: 1,
      familiarity: this.clamp(base * 1.5),
      trust: this.clamp(base * 1.0),
      warmth: this.clamp(base * 1.2),
      affinity: this.clamp(base * 1.0),
      tension: 0,
      comfort: this.clamp(base * 0.8),
      attachment: this.clamp(base * 0.5),
      curiosity: this.clamp(base * 1.5),
      respect: this.clamp(base * 1.0),
      chemistry: this.clamp(base * 1.0),
      romance: 0,
      humor: this.clamp(base * score.humor),
      compatibility: this.clamp(base * 1.0),
      interactionCount: 1,
      conversationCount: 1,
      daysKnown: 1,
    };
  }

  private clamp(v: number): number {
    return Math.min(1, Math.max(0, Math.round(v * 10000) / 10000));
  }
}
