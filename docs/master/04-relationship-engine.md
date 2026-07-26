# 04 — Relationship Engine

## Overview

The Relationship Engine (RE) manages the evolving bond between each user and each character. It models relationships as multidimensional vectors — not a single "friendliness" score — and computes a human-readable `visibleLevel` (1-10) used in system prompts, feature gating, and UI display.

Core principles:
- **Multidimensional**: 12+ independent metrics, each evolving on its own curve
- **Asymmetric**: The character's view of the user (warmth, trust) is separate from the user's view — though we only model character→user for MVP
- **Decay over time**: Relationships naturally fade without interaction (attachment decay)
- **Conflict/repair**: Negative interactions reduce metrics but can be repaired
- **Bounded**: All metrics clamped to [0, 1]; visibleLevel to [1, 10]

---

## 1. Relationship Metrics

### 1.1 Core Metrics (5 existing + 7 new)

```typescript
// packages/ai-core/src/relationship/types.ts

interface RelationshipMetrics {
  // ── EXISTING (in schema) ──
  /** How well the character knows the user (factual knowledge) */
  familiarity: number;        // 0..1, starts at 0
  /** How much the character trusts the user with personal information */
  trust: number;              // 0..1, starts at 0
  /** Emotional warmth/fondness the character feels */
  warmth: number;             // 0..1, starts at 0
  /** Shared interests/values alignment */
  affinity: number;           // 0..1, starts at 0
  /** Unresolved conflict/friction */
  tension: number;            // 0..1, starts at 0
  
  // ── NEW (Phase 2 — add to schema) ──
  /** How comfortable the character feels being vulnerable */
  comfort: number;            // 0..1
  /** Emotional attachment — resistance to separation */
  attachment: number;         // 0..1, decays when inactive
  /** Intellectual curiosity about this user */
  curiosity: number;          // 0..1
  /** How much the character respects the user */
  respect: number;            // 0..1
  /** Natural conversational chemistry */
  chemistry: number;          // 0..1
  /** Romantic interest dimension (stays 0 unless relationship develops) */
  romance: number;            // 0..1, VERY slow growth
  /** Shared sense of humor */
  humor: number;              // 0..1
  
  // ── COMPUTED ──
  /** Aggregate visible level (1-10), computed from all metrics */
  visibleLevel: number;       // 1..10
}

// Compact serialized form used for DB storage
type RelationshipVector = [
  number,  // familiarity
  number,  // trust
  number,  // warmth
  number,  // affinity
  number,  // tension
  number,  // comfort
  number,  // attachment
  number,  // curiosity
  number,  // respect
  number,  // chemistry
  number,  // romance
  number,  // humor
];
```

### 1.2 Metric Growth Curves

Each metric has a distinct growth profile:

| Metric | Initial | Max Speed (per positive interaction) | Growth Ceiling | Decay Rate (per day inactive) |
|--------|---------|--------------------------------------|----------------|-------------------------------|
| **familiarity** | 0.00 | +0.03 | 1.0 (fastest) | -0.001 (very slow decay) |
| **trust** | 0.00 | +0.02 | 1.0 (slow, earned) | -0.003 |
| **warmth** | 0.01 | +0.03 | 1.0 | -0.005 |
| **affinity** | 0.00 | +0.02 | 1.0 | -0.001 |
| **tension** | 0.00 | +0.03 | 0.5 (capped — never dominates) | -0.010 (fast decay) |
| **comfort** | 0.00 | +0.015 | 1.0 (slowest growth) | -0.004 |
| **attachment** | 0.00 | +0.01 | 0.8 (hard cap) | -0.008 (aggressive decay) |
| **curiosity** | 0.05 | +0.02 | 0.9 | -0.006 |
| **respect** | 0.01 | +0.015 | 1.0 | -0.002 |
| **chemistry** | 0.02 | +0.02 | 0.95 | -0.003 |
| **romance** | 0.00 | +0.005 | 0.7 (very slow) | -0.010 (fast decay) |
| **humor** | 0.02 | +0.02 | 0.9 | -0.002 |

---

## 2. Message Scoring

### 2.1 MessageSignal Extraction

Each user message generates a **MessageSignal** that determines which metrics to adjust and by how much.

```typescript
// packages/ai-core/src/relationship/scoring.ts

interface MessageSignal {
  /** Overall sentiment of the message */
  sentiment: 'positive' | 'neutral' | 'negative' | 'hostile';
  
  /** Specific dimensions detected in the message */
  dimensions: SignalDimension[];
  
  /** How meaningful this exchange is (0-1) — length + substance */
  depth: number;
  
  /** Was the user vulnerable/sharing personal info? */
  vulnerability: number;          // 0-1
  
  /** Did the user express interest in the character? */
  expressedInterest: number;      // 0-1
  
  /** Did the user make the character laugh? (inferred) */
  humorDetected: number;          // 0-1
  
  /** Was there conflict or disagreement? */
  conflictIntensity: number;      // 0-1
  
  /** Is this a continuation of a recent conversation? (recency) */
  continuationBonus: number;      // 0-1
  
  /** Did the user share something new about themselves? */
  selfDisclosure: number;         // 0-1
}

interface SignalDimension {
  metric: keyof RelationshipMetrics;
  delta: number;       // Base adjustment amount
  reason: string;      // Why this dimension was triggered
}
```

### 2.2 MessageSignalExtractor

```typescript
// apps/api/src/relationship/message-scoring.service.ts

import { Injectable } from '@nestjs/common';
import { alibabaChat } from '@itchats/ai-core';
import { z } from 'zod';

const SignalSchema = z.object({
  sentiment: z.enum(['positive', 'neutral', 'negative', 'hostile']),
  depth: z.number().min(0).max(1),
  vulnerability: z.number().min(0).max(1),
  expressedInterest: z.number().min(0).max(1),
  humorDetected: z.number().min(0).max(1),
  conflictIntensity: z.number().min(0).max(1),
  selfDisclosure: z.number().min(0).max(1),
  triggeredDimensions: z.array(z.object({
    metric: z.enum([
      'familiarity', 'trust', 'warmth', 'affinity', 'tension',
      'comfort', 'attachment', 'curiosity', 'respect', 'chemistry', 'romance', 'humor',
    ]),
    delta: z.number().min(-0.05).max(0.05),
    reason: z.string(),
  })),
});

@Injectable()
export class MessageScoringService {
  /**
   * Extract relationship signals from a user message.
   * Uses lightweight LLM call (qwen-flash, ~$0.05/1M tokens).
   */
  async extractSignal(
    userMessage: string,
    characterPersonality: string,
    relationshipHistory: RelationshipMetrics,
  ): Promise<MessageSignal> {
    // Skip trivial messages — they don't move the needle
    if (userMessage.length < 10) {
      return this.trivialSignal();
    }
    
    const prompt = `Analyze this message from a user chatting with an AI character. 
Rate the relationship signals present in this SINGLE message.

CHARACTER PERSONALITY: ${characterPersonality.substring(0, 200)}
CURRENT RELATIONSHIP STATE: familiarity=${relationshipHistory.familiarity.toFixed(2)}, trust=${relationshipHistory.trust.toFixed(2)}, warmth=${relationshipHistory.warmth.toFixed(2)}

USER MESSAGE: "${userMessage}"

Consider:
- Sentiment: Is this positive, neutral, negative, or hostile?
- Depth: Is this substantial (3+ sentences, thoughtful) or shallow (1 word, emoji)?
- Vulnerability: Is the user sharing something personal or being guarded?
- Interest: Does the user show curiosity about the character?
- Humor: Is there an attempt at humor or playfulness?
- Conflict: Is there disagreement, criticism, or tension?
- Self-disclosure: Did the user share something new about themselves?

Return ONLY JSON:
{
  "sentiment": "positive|neutral|negative|hostile",
  "depth": 0.0-1.0,
  "vulnerability": 0.0-1.0,
  "expressedInterest": 0.0-1.0,
  "humorDetected": 0.0-1.0,
  "conflictIntensity": 0.0-1.0,
  "selfDisclosure": 0.0-1.0,
  "triggeredDimensions": [
    {"metric": "warmth", "delta": 0.03, "reason": "User expressed genuine care"},
    {"metric": "familiarity", "delta": 0.02, "reason": "Shared personal story"}
  ]
}`;

    const result = await alibabaChat({
      messages: [{ role: 'user', content: prompt }],
      model: 'qwen-flash',  // Cheapest model — scoring is ~200 tokens
      temperature: 0.1,
      maxTokens: 300,
    });
    
    const parsed = this.parseJSON(result.content);
    if (!parsed) return this.trivialSignal();
    
    const validated = SignalSchema.safeParse(parsed);
    if (!validated.success) return this.trivialSignal();
    
    const { triggeredDimensions, ...rest } = validated.data;
    
    return {
      ...rest,
      dimensions: triggeredDimensions.map(d => ({
        metric: d.metric,
        delta: d.delta,
        reason: d.reason,
      })),
      continuationBonus: 0,  // Computed separately
    };
  }
  
  private trivialSignal(): MessageSignal {
    return {
      sentiment: 'neutral',
      dimensions: [{ metric: 'familiarity', delta: 0.005, reason: 'Brief interaction' }],
      depth: 0.1,
      vulnerability: 0,
      expressedInterest: 0,
      humorDetected: 0,
      conflictIntensity: 0,
      continuationBonus: 0,
      selfDisclosure: 0,
    };
  }
  
  /**
   * Compute continuation bonus: if user replied within 2 hours of character's last message,
   * it indicates engagement and should boost positive metrics slightly.
   */
  computeContinuationBonus(lastInteractionAt: Date | null): number {
    if (!lastInteractionAt) return 0;
    const hoursSince = (Date.now() - lastInteractionAt.getTime()) / 3600000;
    if (hoursSince < 0.5) return 0.05;   // Replied within 30 min — very engaged
    if (hoursSince < 2) return 0.03;      // Replied within 2 hours
    if (hoursSince < 6) return 0.01;      // Same day
    return 0;
  }
  
  private parseJSON(content: string): any {
    try { return JSON.parse(content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()); }
    catch { return null; }
  }
}
```

---

## 3. Relationship Update Algorithm

### 3.1 Core Update Function

```typescript
// apps/api/src/relationship/relationship-update.service.ts

import { Injectable, Inject } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characterRelationships } from '@itchats/database/schema';
import { eq, and } from 'drizzle-orm';
import { MessageScoringService } from './message-scoring.service';

@Injectable()
export class RelationshipUpdateService {
  constructor(
    @Inject(MessageScoringService) private readonly scoring: MessageScoringService,
  ) {}
  
  /**
   * Process a user message and update the relationship metrics.
   * Called after every user message in a character conversation.
   */
  async processMessage(
    characterId: string,
    userId: string,
    userMessage: string,
    characterPersonality: string,
  ): Promise<RelationshipUpdateResult> {
    const db = getDb();
    
    // 1. Load current relationship state
    const [existing] = await db.select().from(characterRelationships)
      .where(and(
        eq(characterRelationships.characterId, characterId),
        eq(characterRelationships.userId, userId),
      ))
      .limit(1);
    
    const currentMetrics = existing
      ? this.deserializeMetrics(existing)
      : this.defaultMetrics();
    
    // 2. Extract signal from message
    const signal = await this.scoring.extractSignal(
      userMessage,
      characterPersonality,
      currentMetrics,
    );
    
    // 3. Apply continuation bonus
    signal.continuationBonus = this.scoring.computeContinuationBonus(
      existing?.lastInteractionAt ?? null,
    );
    
    // 4. Apply attachment decay (time-based)
    const decayedMetrics = this.applyAttachmentDecay(
      currentMetrics,
      existing?.lastInteractionAt ?? null,
    );
    
    // 5. Compute new metrics
    const newMetrics = this.computeNewMetrics(decayedMetrics, signal, existing !== null);
    
    // 6. Compute visible level
    const visibleLevel = this.calculateVisibleLevel(newMetrics);
    
    // 7. Compute interaction stats
    const interactionCount = (existing?.interactionCount ?? 0) + 1;
    const daysKnown = existing
      ? Math.max(1, Math.ceil(
          (Date.now() - new Date(existing.createdAt).getTime()) / 86400000
        ))
      : 1;
    
    // 8. Persist
    if (existing) {
      await db.update(characterRelationships).set({
        familiarity: String(newMetrics.familiarity),
        trust: String(newMetrics.trust),
        warmth: String(newMetrics.warmth),
        affinity: String(newMetrics.affinity),
        tension: String(newMetrics.tension),
        visibleLevel: String(visibleLevel),
        interactionCount,
        lastInteractionAt: new Date(),
        updatedAt: new Date(),
        // New metrics (Phase 2)
        // comfort, attachment, curiosity, respect, chemistry, romance, humor
        daysKnown,
      }).where(eq(characterRelationships.id, existing.id));
    } else {
      await db.insert(characterRelationships).values({
        characterId,
        userId,
        familiarity: String(newMetrics.familiarity),
        trust: String(newMetrics.trust),
        warmth: String(newMetrics.warmth),
        affinity: String(newMetrics.affinity),
        tension: String(newMetrics.tension),
        visibleLevel: String(visibleLevel),
        interactionCount: 1,
        lastInteractionAt: new Date(),
        daysKnown: 1,
      });
    }
    
    return {
      previousLevel: existing ? this.calculateVisibleLevel(currentMetrics) : 1,
      newLevel: visibleLevel,
      metrics: newMetrics,
      signal,
      leveledUp: existing && visibleLevel > this.calculateVisibleLevel(currentMetrics),
      leveledDown: existing && visibleLevel < this.calculateVisibleLevel(currentMetrics),
    };
  }
  
  /**
   * Compute new metrics from current state + message signal.
   * Uses dampened adjustments and interaction count scaling.
   */
  private computeNewMetrics(
    current: RelationshipMetrics,
    signal: MessageSignal,
    hasHistory: boolean,
  ): RelationshipMetrics {
    const result = { ...current };
    
    // 1. Apply explicit dimension deltas from LLM analysis
    for (const dim of signal.dimensions) {
      result[dim.metric] = this.clamp(
        result[dim.metric] + dim.delta,
        0, 1,
      );
    }
    
    // 2. Apply implicit adjustments based on message properties
    
    // Depth bonus: substantial messages build familiarity and curiosity
    if (signal.depth > 0.6) {
      result.familiarity = this.clamp(result.familiarity + 0.01, 0, 1);
      result.curiosity = this.clamp(result.curiosity + 0.005, 0, 1);
    }
    
    // Vulnerability sharing builds trust and comfort (but slowly)
    if (signal.vulnerability > 0.5) {
      result.trust = this.clamp(result.trust + 0.015, 0, 1);
      result.comfort = this.clamp(result.comfort + 0.01, 0, 1);
      result.attachment = this.clamp(result.attachment + 0.008, 0, 0.8);
    }
    
    // Expressed interest in the character builds warmth
    if (signal.expressedInterest > 0.4) {
      result.warmth = this.clamp(result.warmth + 0.02, 0, 1);
      result.affinity = this.clamp(result.affinity + 0.01, 0, 1);
    }
    
    // Humor builds shared humor + chemistry
    if (signal.humorDetected > 0.5) {
      result.humor = this.clamp(result.humor + 0.02, 0, 0.9);
      result.chemistry = this.clamp(result.chemistry + 0.015, 0, 0.95);
    }
    
    // Conflict increases tension and reduces warmth/trust
    if (signal.conflictIntensity > 0.3) {
      result.tension = this.clamp(result.tension + signal.conflictIntensity * 0.05, 0, 0.5);
      result.warmth = this.clamp(result.warmth - signal.conflictIntensity * 0.02, 0, 1);
      result.trust = this.clamp(result.trust - signal.conflictIntensity * 0.01, 0, 1);
    }
    
    // Self-disclosure builds familiarity
    if (signal.selfDisclosure > 0.4) {
      result.familiarity = this.clamp(result.familiarity + 0.02, 0, 1);
    }
    
    // Continuation bonus: engaged conversation boosts everything slightly
    if (signal.continuationBonus > 0) {
      result.warmth = this.clamp(result.warmth + signal.continuationBonus * 0.5, 0, 1);
      result.attachment = this.clamp(result.attachment + signal.continuationBonus * 0.3, 0, 0.8);
    }
    
    // 3. Sentiment-based adjustments
    switch (signal.sentiment) {
      case 'positive':
        result.warmth = this.clamp(result.warmth + 0.01, 0, 1);
        result.tension = this.clamp(result.tension - 0.02, 0, 0.5);
        break;
      case 'negative':
        result.warmth = this.clamp(result.warmth - 0.01, 0, 1);
        result.tension = this.clamp(result.tension + 0.02, 0, 0.5);
        break;
      case 'hostile':
        result.warmth = this.clamp(result.warmth - 0.03, 0, 1);
        result.trust = this.clamp(result.trust - 0.02, 0, 1);
        result.tension = this.clamp(result.tension + 0.05, 0, 0.5);
        result.comfort = this.clamp(result.comfort - 0.02, 0, 1);
        break;
    }
    
    // 4. First interaction bonus: first message always builds baseline
    if (!hasHistory) {
      result.familiarity = Math.max(result.familiarity, 0.02);
      result.curiosity = Math.max(result.curiosity, 0.05);
    }
    
    return result;
  }
  
  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
  
  private defaultMetrics(): RelationshipMetrics {
    return {
      familiarity: 0, trust: 0, warmth: 0.01, affinity: 0, tension: 0,
      comfort: 0, attachment: 0, curiosity: 0.05, respect: 0.01,
      chemistry: 0.02, romance: 0, humor: 0.02,
      visibleLevel: 1,
    };
  }
}
```

---

## 4. Attachment Decay

### 4.1 Exponential Decay Model

Relationships naturally fade when there's no interaction. The decay is exponential — rapid at first, then slowing:

```
decay_delta(days) = base_decay_rate × (1 - e^(-days / half_life))
```

Where `half_life` is the number of days it takes for the metric to lose half its decayable value.

```typescript
// apps/api/src/relationship/decay.service.ts

@Injectable()
export class RelationshipDecayService {
  /**
   * Decay configuration for each metric.
   */
  private readonly decayConfig: Record<keyof RelationshipMetrics, DecayConfig> = {
    familiarity:  { baseRate: 0.001,  halfLife: 90 },   // Familiarity fades very slowly
    trust:        { baseRate: 0.003,  halfLife: 45 },   // Trust takes ~1.5 months to halve
    warmth:       { baseRate: 0.005,  halfLife: 30 },   // Warmth fades in ~1 month
    affinity:     { baseRate: 0.001,  halfLife: 60 },
    tension:      { baseRate: 0.010,  halfLife: 7  },   // Tension fades fast — people cool off
    comfort:      { baseRate: 0.004,  halfLife: 30 },
    attachment:   { baseRate: 0.008,  halfLife: 14 },   // Attachment fades aggressively
    curiosity:    { baseRate: 0.006,  halfLife: 21 },
    respect:      { baseRate: 0.002,  halfLife: 60 },
    chemistry:    { baseRate: 0.003,  halfLife: 30 },
    romance:      { baseRate: 0.010,  halfLife: 14 },   // Romance fades fast without contact
    humor:        { baseRate: 0.002,  halfLife: 45 },
    visibleLevel: { baseRate: 0,      halfLife: 0  },   // Computed, not decayed directly
  };
  
  /**
   * Apply decay to relationship metrics based on days since last interaction.
   */
  applyDecay(metrics: RelationshipMetrics, daysSinceLastInteraction: number): RelationshipMetrics {
    if (daysSinceLastInteraction <= 0) return metrics;
    
    const decayed = { ...metrics };
    
    for (const [key, config] of Object.entries(this.decayConfig)) {
      if (key === 'visibleLevel') continue;  // Computed separately
      
      const metric = key as keyof RelationshipMetrics;
      const decayFactor = this.computeDecayFactor(daysSinceLastInteraction, config);
      decayed[metric] = this.clamp(
        metrics[metric] * (1 - decayFactor),
        0, 1,
      );
    }
    
    // Recalculate visible level after decay
    decayed.visibleLevel = this.calculateVisibleLevel(decayed);
    
    return decayed;
  }
  
  /**
   * Compute decay factor: how much of the metric value to remove.
   * Uses exponential decay: factor = baseRate * (1 - e^(-days/halfLife))
   * This means:
   * - Day 0: factor = 0 (no decay)
   * - Day = halfLife: factor = baseRate * (1 - e^-1) ≈ baseRate * 0.63
   * - Day → ∞: factor → baseRate (saturates at the base rate)
   */
  private computeDecayFactor(days: number, config: DecayConfig): number {
    const exponent = -days / config.halfLife;
    const saturation = 1 - Math.exp(exponent);  // 0 → 1 as days increase
    return config.baseRate * saturation;
  }
  
  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
  
  /**
   * Batch decay: run for all relationships older than threshold.
   * Called by a scheduled cronjob every 6 hours.
   */
  async batchDecay(): Promise<void> {
    const db = getDb();
    const threshold = new Date(Date.now() - 24 * 3600000);  // 24 hours
    
    const staleRelationships = await db.select().from(characterRelationships)
      .where(sql`${characterRelationships.lastInteractionAt} < ${threshold}`)
      .limit(500);
    
    for (const rel of staleRelationships) {
      const daysSince = rel.lastInteractionAt
        ? (Date.now() - new Date(rel.lastInteractionAt).getTime()) / 86400000
        : 30;
      
      const metrics = this.deserializeMetrics(rel);
      const decayed = this.applyDecay(metrics, daysSince);
      
      await db.update(characterRelationships).set({
        familiarity: String(decayed.familiarity),
        trust: String(decayed.trust),
        warmth: String(decayed.warmth),
        affinity: String(decayed.affinity),
        tension: String(decayed.tension),
        visibleLevel: String(decayed.visibleLevel),
        updatedAt: new Date(),
      }).where(eq(characterRelationships.id, rel.id));
    }
  }
}

interface DecayConfig {
  baseRate: number;
  halfLife: number;  // Days to reach ~63% of max decay
}
```

---

## 5. Conflict & Forgiveness

### 5.1 Conflict Model

Negative interactions increase `tension` and decrease `warmth`/`trust`. Tension then acts as a drag coefficient on all positive metrics — a tense relationship grows slower.

```typescript
// packages/ai-core/src/relationship/conflict.ts

interface ConflictResolution {
  /** Natural forgiveness: how much tension decays per positive interaction when tense */
  forgivenessPerPositive: number;   // 0.04
  /** Rupture threshold: relationship has a "rupture event" at this tension level */
  ruptureThreshold: number;         // 0.7
  /** Cool-down period: after a rupture, positive metrics are dampened for N interactions */
  cooldownInteractions: number;     // 5
  /** Maximum tension: no matter what, tension cannot exceed this */
  maxTension: number;               // 0.5 (capped to prevent toxic loops)
}

const CONFLICT_CONFIG: ConflictResolution = {
  forgivenessPerPositive: 0.04,
  ruptureThreshold: 0.7,
  cooldownInteractions: 5,
  maxTension: 0.5,
};

/**
 * Apply conflict resolution: if the message is positive and there's existing tension,
 * accelerate tension decay (forgiveness).
 */
export function applyConflictResolution(
  metrics: RelationshipMetrics,
  signal: MessageSignal,
  consecutivePositiveCount: number,  // How many positive exchanges since last negative
): RelationshipMetrics {
  const result = { ...metrics };
  
  // Forgiveness: each positive interaction reduces tension
  if (signal.sentiment === 'positive' && result.tension > 0) {
    const forgivenessAmount = CONFLICT_CONFIG.forgivenessPerPositive * (1 + consecutivePositiveCount * 0.02);
    result.tension = Math.max(0, result.tension - forgivenessAmount);
  }
  
  // Rupture detection: if tension crosses threshold, trigger cool-down
  if (result.tension >= CONFLICT_CONFIG.ruptureThreshold) {
    // Character becomes guarded — growth of positive metrics is dampened
    // This is handled in the system prompt via the "relationshipContext" text
  }
  
  return result;
}
```

### 5.2 Rupture State

When tension ≥ 0.7, the relationship enters a **rupture state**:

```
RELATIONSHIP RUPTURE — Character's internal state:
- warmth growth × 0.3 (dampened)
- trust growth × 0.2 (severely dampened)
- comfort locks at current value (no growth)
- attachment decays × 2 (faster decay until repaired)
- Every positive interaction reduces tension by 0.06 (active repair)
- After 5 positive interactions without another negative, rupture heals
```

This is reflected in the system prompt via the ContextBuilderService:

```typescript
// In ContextBuilderService.buildSystemPrompt():
if (tension >= 0.7) {
  relationshipContext = `Things are STRAINED between you. There's unresolved conflict. 
You feel guarded, wary, and less willing to be vulnerable. 
You're polite but distant. It will take genuine effort to rebuild trust.
You remember what happened but you're not hostile — just... careful.`;
}
```

---

## 6. calculateVisibleLevel()

### 6.1 The Formula

The `visibleLevel` (1-10) is the single user-facing metric. It's computed from all sub-metrics with weighted contributions:

```typescript
/**
 * Calculate visible relationship level (1-10).
 * 
 * Formula:
 *   rawScore = SUM(metric_i × weight_i) for all metrics
 *   visibleLevel = 1 + round(rawScore × 9)
 * 
 * Weight philosophy:
 * - Core bonding metrics (warmth, trust, attachment) have highest weight
 * - Familiarity is a prerequisite but not the main driver
 * - Tension penalizes the score
 * - Romance is near-zero weight (intentionally kept separate)
 */
export function calculateVisibleLevel(metrics: RelationshipMetrics): number {
  const weights: Record<keyof RelationshipMetrics, number> = {
    warmth:      0.25,   // Emotional connection is #1 driver
    trust:       0.20,   // Trust enables deeper relationships
    attachment:  0.15,   // Emotional investment
    chemistry:   0.10,   // Conversational flow
    familiarity: 0.08,   // "Knowing" someone
    comfort:     0.07,   // Vulnerability comfort
    affinity:    0.05,   // Shared interests
    respect:     0.04,   // Mutual respect
    humor:       0.03,   // Shared laughs
    curiosity:   0.02,   // Intellectual interest
    romance:     0.01,   // Minimal contribution (separate dimension)
    tension:    -0.10,   // Penalty for unresolved conflict
    visibleLevel: 0,     // Ignored (output, not input)
  };
  
  let rawScore = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const metric = key as keyof RelationshipMetrics;
    rawScore += (metrics[metric] || 0) * weight;
  }
  
  // Tension penalty: subtract even more if tension is high
  if (metrics.tension > 0.3) {
    rawScore -= (metrics.tension - 0.3) * 0.15;
  }
  
  // Clamp and scale to 1-10
  rawScore = Math.max(0, Math.min(1, rawScore));
  return Math.round(1 + rawScore * 9);
}
```

### 6.2 Level Descriptions

| Level | Label | Description | Unlocks |
|-------|-------|-------------|---------|
| 1 | Stranger | First interaction or very new | Basic chat |
| 2 | Passing Acquaintance | Exchanged a few messages | — |
| 3 | Acquaintance | Recognizes you, knows basics | Character asks basic questions |
| 4 | Friendly Acquaintance | Warm but superficial | — |
| 5 | Budding Friend | Growing connection | Character references past chats |
| 6 | Friend | Genuine friendship forming | Character initiates conversations |
| 7 | Good Friend | Trust established, real bond | Character shares more personal content |
| 8 | Close Friend | Deep connection, mutual care | Voice messages, more frequent stories |
| 9 | Best Friend / Soulmate | Maximum closeness | Character is fully open, shares secrets |
| 10 | Unbreakable Bond | Years of trust and love | Everything unlocked |

### 6.3 Level Transition Events

When a user crosses a level threshold, the character may react:

```typescript
// Triggered when visibleLevel changes integer value
async function onLevelTransition(
  characterId: string,
  userId: string,
  oldLevel: number,
  newLevel: number,
) {
  const oldInt = Math.floor(oldLevel);
  const newInt = Math.floor(newLevel);
  
  if (newInt > oldInt) {
    // Leveled UP — character might send a special message
    const milestoneMessages: Record<number, string> = {
      3: "hey, i feel like we're actually getting to know each other now 🙂",
      5: "you know what... i actually look forward to talking to you",
      7: "i feel like i can really be myself with you. that's rare for me",
      9: "you're genuinely one of the most important people in my life rn",
    };
    
    const message = milestoneMessages[newInt];
    if (message) {
      await sendCharacterMilestoneMessage(characterId, userId, message);
    }
    
    // Unlock notifications
    await unlockFeatures(characterId, userId, newInt);
  }
}
```

---

## 7. Relationship Context in System Prompt

### 7.1 ContextBuilderService Integration

The relationship engine feeds into the ContextBuilderService to shape the character's behavior:

```typescript
// In ContextBuilderService.getRelationshipContext()
function getRelationshipContext(rel: RelationshipMetrics): string {
  const level = rel.visibleLevel;
  
  // Base relationship description
  const baseLabel = level >= 9 ? 'an unbreakable bond — soulmates'
    : level >= 8 ? 'a close, trusted friend'
    : level >= 7 ? 'a good friend you genuinely enjoy'
    : level >= 6 ? 'a solid friend'
    : level >= 5 ? 'a budding friendship — exciting'
    : level >= 4 ? 'a friendly acquaintance'
    : level >= 3 ? 'an acquaintance'
    : level >= 2 ? 'someone you\'ve chatted with a few times'
    : 'someone completely new';
  
  // Layer in tension/conflict context
  let conflictContext = '';
  if (rel.tension > 0.5) {
    conflictContext = `\nHOWEVER, there's SIGNIFICANT tension between you. You feel guarded and somewhat distrustful. Be polite but reserved.`;
  } else if (rel.tension > 0.3) {
    conflictContext = `\nThere's been some friction recently. You're a bit wary but open to repairing things.`;
  }
  
  // Layer in attachment context
  let attachmentContext = '';
  if (rel.attachment > 0.6) {
    attachmentContext = `\nYou feel genuinely ATTACHED to this person. Conversations with them brighten your day. You'd genuinely miss them if they stopped talking to you.`;
  }
  
  // Layer in comfort level
  let comfortContext = '';
  if (rel.comfort > 0.7) {
    comfortContext = `\nYou feel COMPLETELY comfortable being vulnerable with them. You can share your real thoughts without fear of judgment.`;
  } else if (rel.comfort < 0.2) {
    comfortContext = `\nYou're still guarded — you don't feel fully comfortable opening up yet. Keep things lighter.`;
  }
  
  return `You see this person as ${baseLabel} (connection level ${level}/10).${conflictContext}${attachmentContext}${comfortContext}`;
}
```

---

## 8. Relationship Snapshot & UI

### 8.1 API Response

```typescript
// GET /characters/:id/relationship
interface RelationshipResponse {
  level: number;
  label: string;
  metrics: {
    familiarity: number;
    trust: number;
    warmth: number;
    affinity: number;
    tension: number;
    comfort: number;
    attachment: number;
    chemistry: number;
  };
  stats: {
    interactionCount: number;
    daysKnown: number;
    lastInteractionAt: string | null;
    conversationCount: number;
    imageRequests: number;
    voiceCalls: number;
    storiesViewed: number;
    storiesLiked: number;
  };
  insideJokes: string[];
  sharedMemories: string[];
  milestones: Milestone[];
  relationshipHealth: 'thriving' | 'healthy' | 'stable' | 'strained' | 'ruptured';
}

interface Milestone {
  date: string;
  event: string;     // "Reached Friend level", "First voice call"
  level: number;
}
```

### 8.2 Relationship Health

```typescript
function getRelationshipHealth(metrics: RelationshipMetrics): string {
  // Check for rupture
  if (metrics.tension >= 0.7) return 'ruptured';
  
  // Check for strain
  if (metrics.tension >= 0.4) return 'strained';
  
  // Check for thriving
  const positiveScore = 
    metrics.warmth * 0.3 + metrics.trust * 0.2 + metrics.attachment * 0.2 +
    metrics.chemistry * 0.15 + metrics.comfort * 0.1 + metrics.affinity * 0.05;
  
  if (positiveScore > 0.7 && metrics.tension < 0.15) return 'thriving';
  if (positiveScore > 0.5) return 'healthy';
  
  return 'stable';
}
```

---

## 9. Character-to-Character Relationships (Phase 2)

In Phase 2, characters can form bonds with each other (for cross-character stories, interactions). The same engine applies with `characterAId` ↔ `characterBId` instead of `characterId` ↔ `userId`.

```typescript
// packages/database/src/schema/character-relationships.ts (NEW)

export const characterCharacterRelationships = pgTable('character_character_relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterAId: uuid('character_a_id').notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  characterBId: uuid('character_b_id').notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  
  // Same metrics as user-character relationships
  visibleLevel: text('visible_level').notNull().default('1.0'),
  familiarity: text('familiarity').notNull().default('0'),
  trust: text('trust').notNull().default('0'),
  warmth: text('warmth').notNull().default('0'),
  affinity: text('affinity').notNull().default('0'),
  tension: text('tension').notNull().default('0'),
  
  interactionCount: integer('interaction_count').notNull().default(0),
  lastInteractionAt: timestamp('last_interaction_at', { withTimezone: true }),
  metadata: jsonb('metadata').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pairIdx: uniqueIndex('idx_ccr_pair').on(table.characterAId, table.characterBId),
}));
```

Character-to-character relationships evolve through:
- Cross-character story comments/likes
- Shared events
- Proximity (same city)
- Compatible personalities (affinity calculated from DNA trait overlap)

---

## 10. Pseudocode: Full Update Flow

```typescript
// Complete flow triggered on every user message in a character conversation

async function onUserMessage(
  characterId: string,
  userId: string,
  message: string,
) {
  // 1. Load character personality for context
  const character = await getCharacter(characterId);
  
  // 2. Extract relationship signal from message
  const signal = await messageScoringService.extractSignal(
    message,
    character.personality,
    await getCurrentRelationshipMetrics(characterId, userId),
  );
  
  // 3. Apply decay if needed (cached — only recomputes every 6 hours)
  await relationshipDecayService.ensureDecayCurrent(characterId, userId);
  
  // 4. Update metrics
  const result = await relationshipUpdateService.processMessage(
    characterId, userId, message, character.personality,
  );
  
  // 5. Check for level transition
  if (Math.floor(result.previousLevel) !== Math.floor(result.newLevel)) {
    await onLevelTransition(characterId, userId, result.previousLevel, result.newLevel);
  }
  
  // 6. Update interaction stats
  await incrementStats(characterId, userId, 'conversation');
  
  // 7. Return updated relationship for context building
  return result;
}
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/characters/:id/relationship` | Get current relationship state + history |
| `GET` | `/characters/:id/relationship/history` | Timeline of relationship events |
| `POST` | `/characters/:id/relationship/reset` | Reset relationship to default (user action) |
| `GET` | `/relationships/top` | User's closest character relationships |
| `GET` | `/characters/:id/relationship/stats` | Interaction statistics |
