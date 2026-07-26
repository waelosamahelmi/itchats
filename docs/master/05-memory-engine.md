# 05 — Memory Engine

## Overview

The Memory Engine (ME) gives AI characters persistent knowledge about users. It extracts facts from conversations, stores them with decaying importance scores, and retrieves the most relevant memories during context building. This is what makes a character remember that your cat is named Mochi or that you hate cilantro — across days, weeks, and conversations.

Architecture layers:
1. **Memory Extraction** — LLM analyzes exchanges for memorable facts
2. **Memory Storage** — Typed, scored, embedded storage with expiration
3. **Memory Retrieval** — Scored retrieval formula combining relevance, importance, and recency
4. **Importance Decay** — Memories fade if not reinforced
5. **Embedding Strategy** — Semantic search via pgvector (Phase 2 upgrade from text matching)

---

## 1. Memory Types

### 1.1 Type Taxonomy

```typescript
// packages/ai-core/src/memory/types.ts

type MemoryType =
  | 'identity_fact'       // Name, age, location, job, family background
  | 'preference'           // Likes, dislikes, favorites, opinions, habits
  | 'relationship_event'   // Meaningful moments: first "I trust you", a fight, a confession
  | 'promise'              // User committed to something ("I'll send you that pic tomorrow")
  | 'recurring_topic'      // Topics the user brings up repeatedly
  | 'sensitive_fact'       // Potentially private info — always low importance, never in prompts
  | 'temporary_context';   // Short-lived context: "I'm at a cafe rn", "my phone is dying"

// Priority for context inclusion (lower = more likely to be included)
const TYPE_PRIORITY: Record<MemoryType, number> = {
  'relationship_event': 1,   // Most important — shapes the relationship itself
  'promise':             2,   // Must remember commitments
  'preference':          3,   // Personalization gold
  'identity_fact':       4,   // Core knowledge
  'recurring_topic':     5,   // Useful context
  'temporary_context':   6,   // Fleeting — expires fast
  'sensitive_fact':      7,   // Remember but NEVER surface in prompts
};
```

### 1.2 Memory Lifecycle

```
 ┌──────────┐    extractMemory()    ┌─────────────┐
 │ Chat     │ ────────────────────→ │ Extraction  │
 │ Exchange │                       │ (LLM call)  │
 └──────────┘                       └──────┬──────┘
                                           │ JSON: {content, type, importance, confidence}
                                           ▼
                                    ┌─────────────┐
                                    │  Deduplicate │ ← Check if similar memory exists
                                    │  & Merge     │    (exact content match or embedding)
                                    └──────┬──────┘
                                           │
                                           ▼
                                    ┌─────────────┐
                                    │   Store      │ → character_memories table
                                    │   with TTL   │    expiresAt set by type
                                    └──────┬──────┘
                                           │
                                    ┌──────┴──────┐
                                    ▼             ▼
                              ┌──────────┐  ┌─────────────┐
                              │ Retrieved│  │   Decayed    │
                              │ (scored) │  │ (if dormant) │
                              └──────────┘  └──────┬──────┘
                                                   │ importance -= decay
                                                   ▼
                                            ┌─────────────┐
                                            │  Expired /   │
                                            │  Deleted     │
                                            └─────────────┘
```

---

## 2. Memory Extraction

### 2.1 ExtractionService

```typescript
// apps/api/src/memory/extraction.service.ts

import { Injectable } from '@nestjs/common';
import { alibabaChat } from '@itchats/ai-core';
import { z } from 'zod';

const ExtractionResultSchema = z.object({
  memories: z.array(z.object({
    content: z.string().min(3).max(300),
    type: z.enum([
      'identity_fact', 'preference', 'relationship_event', 'promise',
      'recurring_topic', 'sensitive_fact', 'temporary_context',
    ]),
    importance: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1),
    reason: z.string().max(100).optional(),
  })),
  relationshipShift: z.object({
    detected: z.boolean(),
    description: z.string().optional(),
    direction: z.enum(['positive', 'negative', 'neutral']).optional(),
  }).optional(),
});

@Injectable()
export class MemoryExtractionService {
  /**
   * Extract memories from a user↔character exchange.
   * Returns an array of memory objects (or empty if nothing memorable).
   * 
   * Cost: ~400 input + ~300 output tokens on qwen-flash ≈ $0.00004
   */
  async extractMemories(
    userMessage: string,
    characterResponse: string,
    characterName: string,
    existingMemories: string[],  // Last 10 memory contents for dedup context
    consecutiveExchanges: number,  // How deep into the conversation (for depth tuning)
  ): Promise<ExtractedMemory[]> {
    // Skip trivial exchanges entirely
    const combined = userMessage + characterResponse;
    if (combined.length < 30 && consecutiveExchanges < 3) return [];
    
    const recentMemoryContext = existingMemories.length > 0
      ? `\nEXISTING MEMORIES (avoid duplicates):\n${existingMemories.map((m, i) => `${i + 1}. ${m}`).join('\n')}`
      : '';
    
    const depthInstructions = consecutiveExchanges > 20
      ? 'Be THOROUGH — this is a deep conversation. Extract nuanced details and emotional subtext.'
      : consecutiveExchanges > 10
        ? 'Look for meaningful details — they\'ve been talking for a while.'
        : 'Only extract CLEARLY important information. Early conversation — be conservative.';
    
    const prompt = `You are ${characterName}'s memory system. Analyze this exchange and extract anything worth remembering about the USER.

USER MESSAGE: "${userMessage.slice(0, 500)}"
CHARACTER RESPONSE: "${characterResponse.slice(0, 300)}"

${depthInstructions}

MEMORY TYPES:
- identity_fact: name, age, location, job, family, pets, background
- preference: likes, dislikes, favorites, opinions, habits, routines
- relationship_event: meaningful moment — first vulnerability, confession, fight, bonding
- promise: user committed to doing something ("I'll send that tomorrow")
- recurring_topic: this topic has come up multiple times
- sensitive_fact: potentially private/embarrassing — mark importance LOW (≤0.3)
- temporary_context: "at a cafe", "phone at 2%" — importance LOW, will auto-expire

IMPORTANCE GUIDELINES:
- 0.8-1.0: Core identity facts, serious promises, major relationship events
- 0.5-0.8: Preferences, recurring topics, interesting personal details
- 0.2-0.5: Minor preferences, passing mentions
- 0.0-0.2: Temporary context, sensitive facts (deliberately low)

CONFIDENCE GUIDELINES:
- 0.9-1.0: Explicitly stated ("I'm a doctor", "I hate cilantro")
- 0.6-0.9: Strongly implied by context
- 0.3-0.6: Weakly implied, might be joking
- 0.0-0.3: Very uncertain

${recentMemoryContext}

Return ONLY valid JSON (no markdown, no explanation):
{
  "memories": [
    {
      "content": "Concise memory text (1 sentence, max 120 chars)",
      "type": "identity_fact",
      "importance": 0.8,
      "confidence": 0.95,
      "reason": "Explicitly stated their profession"
    }
  ],
  "relationshipShift": {
    "detected": true/false,
    "description": "Brief description if the relationship meaningfully shifted",
    "direction": "positive|negative|neutral"
  }
}

If nothing worth remembering, return {"memories": []}. Do not force memories for trivial exchanges.`;

    const result = await alibabaChat({
      messages: [{ role: 'user', content: prompt }],
      model: 'qwen-flash',
      temperature: 0.15,
      maxTokens: 400,
    });
    
    const parsed = this.parseJSON(result.content);
    if (!parsed) return [];
    
    const validated = ExtractionResultSchema.safeParse(parsed);
    if (!validated.success) return [];
    
    return validated.data.memories
      .filter(m => m.content.length >= 3)
      .map(m => ({
        content: m.content.slice(0, 300),
        type: m.type,
        importance: this.clamp(m.importance, 0, 1),
        confidence: this.clamp(m.confidence, 0, 1),
        reason: m.reason,
        relationshipShift: validated.data.relationshipShift?.detected
          ? {
              description: validated.data.relationshipShift.description,
              direction: validated.data.relationshipShift.direction || 'neutral',
            }
          : undefined,
      }));
  }
  
  /**
   * Batch extraction for long conversations.
   * Groups messages into batches of 4 exchanges to stay within token limits.
   */
  async extractConversationMemories(
    messages: { role: 'user' | 'assistant'; content: string }[],
    characterName: string,
  ): Promise<ExtractedMemory[]> {
    const allMemories: ExtractedMemory[] = [];
    const existingContents: string[] = [];
    
    // Process in sliding windows of 4 exchanges (8 messages)
    for (let i = 0; i < messages.length; i += 4) {
      const batch = messages.slice(i, i + 4);
      const userMsgs = batch.filter(m => m.role === 'user').map(m => m.content).join(' | ');
      const charMsgs = batch.filter(m => m.role === 'assistant').map(m => m.content).join(' | ');
      
      const extracted = await this.extractMemories(
        userMsgs,
        charMsgs,
        characterName,
        existingContents.slice(-10),
        Math.floor(i / 2) + 1,  // consecutiveExchanges estimate
      );
      
      allMemories.push(...extracted);
      existingContents.push(...extracted.map(m => m.content));
    }
    
    return allMemories;
  }
  
  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
  
  private parseJSON(content: string): any {
    try { return JSON.parse(content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()); }
    catch { return null; }
  }
}

interface ExtractedMemory {
  content: string;
  type: MemoryType;
  importance: number;
  confidence: number;
  reason?: string;
  relationshipShift?: {
    description?: string;
    direction: 'positive' | 'negative' | 'neutral';
  };
}
```

---

## 3. Memory Storage

### 3.1 StorageService with Deduplication

```typescript
// apps/api/src/memory/storage.service.ts

import { Injectable } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characterMemories } from '@itchats/database/schema';
import { eq, and, sql } from 'drizzle-orm';

@Injectable()
export class MemoryStorageService {
  /**
   * Store a new memory, or merge with existing if duplicate found.
   * Deduplication: exact content match OR embedding cosine similarity > 0.92
   */
  async store(memory: MemoryInput): Promise<StoredMemory> {
    const db = getDb();
    
    // 1. Check for exact duplicate (same content for same character+user)
    const [existing] = await db.select().from(characterMemories)
      .where(and(
        eq(characterMemories.characterId, memory.characterId),
        eq(characterMemories.userId, memory.userId),
        eq(characterMemories.content, memory.content),
      ))
      .limit(1);
    
    if (existing) {
      return this.mergeMemory(existing, memory);
    }
    
    // 2. Compute expiration based on memory type
    const expiresAt = this.computeExpiration(memory.type, memory.importance);
    
    // 3. Insert new memory
    const [record] = await db.insert(characterMemories).values({
      characterId: memory.characterId,
      userId: memory.userId,
      conversationId: memory.conversationId,
      content: memory.content,
      memoryType: memory.type,
      importance: String(memory.importance),
      confidence: String(memory.confidence),
      sourceMessageIds: memory.sourceMessageIds ?? [],
      expiresAt,
    }).returning();
    
    return {
      id: record.id,
      content: record.content,
      type: record.memoryType as MemoryType,
      importance: Number(record.importance),
      confidence: Number(record.confidence),
      isNew: true,
    };
  }
  
  /**
   * Merge a new memory observation with an existing one.
   * - Increase confidence (reinforcement)
   * - Take max importance (keep the higher score)
   * - Reset expiration (bump TTL for active memories)
   * - Increment recall count
   */
  private async mergeMemory(
    existing: typeof characterMemories.$inferSelect,
    incoming: MemoryInput,
  ): Promise<StoredMemory> {
    const db = getDb();
    
    const newConfidence = Math.min(1, Number(existing.confidence) + 0.1);
    const newImportance = Math.max(Number(existing.importance), incoming.importance);
    const newExpiresAt = this.computeExpiration(incoming.type, newImportance);
    
    await db.update(characterMemories).set({
      confidence: String(newConfidence),
      importance: String(newImportance),
      recallCount: (existing.recallCount || 0) + 1,
      lastRecalledAt: new Date(),
      expiresAt: newExpiresAt,
      updatedAt: new Date(),
    }).where(eq(characterMemories.id, existing.id));
    
    return {
      id: existing.id,
      content: existing.content,
      type: existing.memoryType as MemoryType,
      importance: newImportance,
      confidence: newConfidence,
      isNew: false,
    };
  }
  
  /**
   * Compute expiration date based on memory type and importance.
   * Important permanent memories never expire.
   */
  private computeExpiration(type: MemoryType, importance: number): Date | null {
    switch (type) {
      case 'temporary_context':
        // Always expires within 3-14 days regardless of importance
        const days = 3 + (1 - importance) * 11;
        return new Date(Date.now() + days * 86400000);
      
      case 'sensitive_fact':
        // Expires in 30-90 days (we don't want to keep private info forever)
        return new Date(Date.now() + 30 * 86400000);
      
      case 'promise':
        // Promises expire after 30 days (they're either fulfilled or forgotten)
        return new Date(Date.now() + 30 * 86400000);
      
      case 'identity_fact':
        // Permanent (unless contradicted)
        if (importance > 0.7) return null;
        return new Date(Date.now() + 180 * 86400000);  // 6 months for low-importance facts
      
      case 'preference':
        // Long-lived but can expire
        if (importance > 0.6) return null;
        return new Date(Date.now() + 90 * 86400000);
      
      case 'relationship_event':
        // These are permanent milestones
        return null;
      
      case 'recurring_topic':
        // Expires if not reinforced
        return new Date(Date.now() + 60 * 86400000);
      
      default:
        return new Date(Date.now() + 30 * 86400000);
    }
  }
  
  /**
   * Clean up expired memories. Called by a cron job every 24 hours.
   */
  async purgeExpired(): Promise<number> {
    const db = getDb();
    const result = await db.delete(characterMemories)
      .where(sql`${characterMemories.expiresAt} IS NOT NULL AND ${characterMemories.expiresAt} < NOW()`);
    return result.rowCount || 0;
  }
}

interface MemoryInput {
  characterId: string;
  userId: string;
  conversationId?: string;
  content: string;
  type: MemoryType;
  importance: number;
  confidence: number;
  sourceMessageIds?: string[];
}

interface StoredMemory {
  id: string;
  content: string;
  type: MemoryType;
  importance: number;
  confidence: number;
  isNew: boolean;
}
```

---

## 4. Scored Retrieval Formula

### 4.1 The Formula

The retrieval score determines which memories are injected into the system prompt. The current formula (already implemented in MemoryService) is:

```
SCORE = relevance × 0.50 + importance × 0.25 + recency × 0.15 + reinforcement × 0.10
```

Where:
- **relevance** (0-1): How many query terms from the user's message appear in the memory content
- **importance** (0-1): The stored importance score
- **recency** (0-1): `1 - min(30, daysAgo) / 30` — recent memories score higher
- **reinforcement** (0-1): `min(1, recallCount / 10)` — frequently recalled memories are more salient

### 4.2 Enhanced Retrieval with Embeddings (Phase 2)

```typescript
// apps/api/src/memory/retrieval.service.ts

import { Injectable } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characterMemories } from '@itchats/database/schema';
import { eq, and, sql } from 'drizzle-orm';

interface ScoredMemory {
  id: string;
  content: string;
  type: MemoryType;
  importance: number;
  confidence: number;
  score: number;
  relevanceScore: number;
  recencyScore: number;
  reinforcementScore: number;
  createdAt: Date;
}

@Injectable()
export class MemoryRetrievalService {
  /**
   * Retrieve top N memories for context building.
   * 
   * Phase 1 (current): Text-matching relevance
   * Phase 2 (future): Semantic embedding similarity via pgvector
   */
  async retrieve(
    characterId: string,
    userId: string,
    userMessage: string,
    limit = 8,
    currentConversationMemories: string[] = [],  // Avoid repeating what's in chat
  ): Promise<ScoredMemory[]> {
    const db = getDb();
    
    // 1. Fetch candidate memories (non-expired, sorted by recency)
    const candidates = await db.select().from(characterMemories)
      .where(and(
        eq(characterMemories.characterId, characterId),
        eq(characterMemories.userId, userId),
        sql`(${characterMemories.expiresAt} IS NULL OR ${characterMemories.expiresAt} > NOW())`,
      ))
      .orderBy(sql`${characterMemories.createdAt} DESC`)
      .limit(100);  // Candidate pool — score the top 100 by recency
    
    if (candidates.length === 0) return [];
    
    // 2. Extract query terms from user message (with stopword removal)
    const queryTerms = this.tokenize(userMessage);
    
    // 3. Score each candidate
    const now = Date.now();
    const scored = candidates.map(m => {
      const content = (m.content || '').toLowerCase();
      
      // Relevance: term overlap ratio
      const matchCount = queryTerms.filter(t => content.includes(t)).length;
      const relevance = queryTerms.length > 0
        ? matchCount / queryTerms.length
        : 0.25;  // Default relevance for short messages
      
      // Importance from DB
      const importance = Number(m.importance) || 0.5;
      
      // Recency: days ago, capped at 30
      const ageDays = Math.min(30, (now - new Date(m.createdAt).getTime()) / 86400000);
      const recencyScore = Math.max(0, 1 - ageDays / 30);
      
      // Reinforcement: recall count bonus
      const recallCount = Number(m.recallCount || 0);
      const reinforcementScore = Math.min(1, recallCount / 10);
      
      // Type priority bonus: prefer certain types for context
      const typePriority = TYPE_PRIORITY[m.memoryType as MemoryType] || 5;
      const typeBonus = (8 - typePriority) / 8 * 0.05;  // Up to 0.04 bonus
      
      // Combined score (with type bonus)
      const score = relevance * 0.48
        + importance * 0.25
        + recencyScore * 0.15
        + reinforcementScore * 0.10
        + typeBonus;
      
      return {
        id: m.id,
        content: m.content,
        type: m.memoryType as MemoryType,
        importance,
        confidence: Number(m.confidence) || 0.5,
        score: Math.round(score * 1000) / 1000,
        relevanceScore: Math.round(relevance * 100) / 100,
        recencyScore: Math.round(recencyScore * 100) / 100,
        reinforcementScore: Math.round(reinforcementScore * 100) / 100,
        createdAt: m.createdAt,
      };
    });
    
    // 4. Sort by score descending, take top N
    const sorted = scored.sort((a, b) => b.score - a.score);
    
    // 5. Diversity filter: if two memories are very similar, keep only the higher-scored one
    const diverse = this.filterDiverse(sorted, limit);
    
    // 6. Update recall counts for retrieved memories (fire-and-forget)
    for (const mem of diverse) {
      db.update(characterMemories).set({
        lastRecalledAt: new Date(),
        recallCount: sql`${characterMemories.recallCount} + 1`,
        updatedAt: new Date(),
      }).where(eq(characterMemories.id, mem.id)).execute().catch(() => {});
    }
    
    return diverse;
  }
  
  /**
   * Tokenize user message into meaningful search terms.
   * Removes stopwords, punctuation, and very short words.
   */
  private tokenize(message: string): string[] {
    const STOPWORDS = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'i', 'me', 'my', 'you', 'your', 'he', 'she', 'it', 'we', 'they',
      'this', 'that', 'these', 'those', 'and', 'or', 'but', 'if', 'then',
      'in', 'on', 'at', 'to', 'for', 'of', 'with', 'from', 'by', 'about',
      'what', 'when', 'where', 'who', 'how', 'why', 'do', 'does', 'did',
      'can', 'could', 'will', 'would', 'should', 'just', 'like', 'so',
      'very', 'really', 'actually', 'yeah', 'yes', 'no', 'not',
      'hi', 'hey', 'hello', 'ok', 'okay', 'oh', 'um', 'uh',
      'im', 'ive', 'dont', 'cant', 'wont',
      'its', 'thats', 'whats', 'youre', 'theyre',
    ]);
    
    return message.toLowerCase()
      .replace(/[^\w\s]/g, '')     // Remove punctuation
      .split(/\s+/)
      .filter(t => t.length > 2 && !STOPWORDS.has(t));
  }
  
  /**
   * Diversity filter: remove near-duplicate memories.
   * Two memories are "duplicates" if they share >60% of significant words.
   */
  private filterDiverse(memories: ScoredMemory[], limit: number): ScoredMemory[] {
    const result: ScoredMemory[] = [];
    
    for (const mem of memories) {
      if (result.length >= limit) break;
      
      const memWords = new Set(this.tokenize(mem.content));
      
      const isDuplicate = result.some(existing => {
        const existingWords = new Set(this.tokenize(existing.content));
        const intersection = [...memWords].filter(w => existingWords.has(w)).length;
        const union = new Set([...memWords, ...existingWords]).size;
        return union > 0 && intersection / union > 0.6;
      });
      
      if (!isDuplicate) {
        result.push(mem);
      }
    }
    
    return result.slice(0, limit);
  }
  
  /**
   * Phase 2: Semantic retrieval using pgvector embeddings.
   * Replaces token-based relevance with cosine similarity to the query embedding.
   */
  async retrieveSemantic(
    characterId: string,
    userId: string,
    queryEmbedding: number[],  // 1024-dim vector from alibabaEmbedText
    limit = 8,
  ): Promise<ScoredMemory[]> {
    // pgvector cosine similarity query:
    // SELECT *, 1 - (embedding <=> $queryEmbedding) AS similarity
    // FROM character_memories
    // WHERE character_id = $charId AND user_id = $userId
    //   AND (expires_at IS NULL OR expires_at > NOW())
    // ORDER BY similarity DESC
    // LIMIT $limit;
    
    const db = getDb();
    
    // Convert embedding to pgvector literal: '[0.1, 0.2, ...]'
    const embeddingLiteral = `[${queryEmbedding.join(',')}]`;
    
    const results = await db.execute(sql`
      SELECT 
        id, content, memory_type, importance, confidence, created_at,
        1 - (embedding <=> ${embeddingLiteral}::vector) AS relevance_score
      FROM character_memories
      WHERE character_id = ${characterId}::uuid
        AND user_id = ${userId}::uuid
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY relevance_score DESC
      LIMIT ${limit}
    `);
    
    // ... map results to ScoredMemory[]
    return [];
  }
}
```

---

## 5. Importance Decay

### 5.1 Decay Model

Memories lose importance over time if never recalled. The decay is logistic — slow at first, then accelerating, then plateauing:

```
importance(t) = importance_0 × (1 - decay_rate × sigmoid(t / half_life - 1))
```

Where `sigmoid(x) = 1 / (1 + e^(-x))`.

```typescript
// apps/api/src/memory/decay.service.ts

@Injectable()
export class MemoryDecayService {
  /**
   * Decay config per memory type.
   */
  private readonly decayConfig: Record<MemoryType, DecayParams> = {
    identity_fact:       { halfLife: 365, decayRate: 0.3 },   // Very slow decay
    preference:          { halfLife: 90,  decayRate: 0.5 },
    relationship_event:  { halfLife: 180, decayRate: 0.2 },   // Milestones barely decay
    promise:             { halfLife: 30,  decayRate: 0.7 },   // Promises decay fast
    recurring_topic:     { halfLife: 60,  decayRate: 0.6 },
    sensitive_fact:      { halfLife: 90,  decayRate: 0.8 },   // Let private info fade
    temporary_context:   { halfLife: 3,   decayRate: 0.95 },  // Rapid decay
  };
  
  /**
   * Apply importance decay to a single memory.
   */
  decayImportance(memory: { importance: number; type: MemoryType; createdAt: Date }): number {
    const config = this.decayConfig[memory.type];
    const daysSinceCreation = (Date.now() - memory.createdAt.getTime()) / 86400000;
    
    // Sigmoid-based decay
    const x = daysSinceCreation / config.halfLife - 1;
    const sigmoid = 1 / (1 + Math.exp(-x));
    const decayFactor = config.decayRate * sigmoid;
    
    return memory.importance * (1 - decayFactor);
  }
  
  /**
   * Batch decay: run daily to update all non-recently-recalled memories.
   * Only decays memories not recalled in the last 7 days.
   */
  async batchDecay(): Promise<number> {
    const db = getDb();
    
    const staleThreshold = new Date(Date.now() - 7 * 86400000);  // 7 days
    
    const staleMemories = await db.select().from(characterMemories)
      .where(and(
        sql`${characterMemories.lastRecalledAt} IS NULL OR ${characterMemories.lastRecalledAt} < ${staleThreshold}`,
        sql`${characterMemories.expiresAt} IS NULL OR ${characterMemories.expiresAt} > NOW()`,
      ))
      .limit(1000);
    
    let updated = 0;
    
    for (const mem of staleMemories) {
      const newImportance = this.decayImportance({
        importance: Number(mem.importance),
        type: mem.memoryType as MemoryType,
        createdAt: mem.createdAt,
      });
      
      // Only update if importance changed meaningfully
      if (Math.abs(newImportance - Number(mem.importance)) > 0.01) {
        await db.update(characterMemories).set({
          importance: String(this.clamp(newImportance, 0.05, 1)),
          updatedAt: new Date(),
        }).where(eq(characterMemories.id, mem.id));
        updated++;
      }
    }
    
    return updated;
  }
}

interface DecayParams {
  halfLife: number;   // Days to reach ~50% decay
  decayRate: number;  // Maximum decay proportion (0-1)
}
```

---

## 6. Embedding Strategy

### 6.1 Phase 1: Text Matching (Current)

- **Relevance**: Term overlap between user message and memory content
- **Pros**: Zero additional cost, fast, no vector DB needed
- **Cons**: Misses semantic similarity ("my dog" won't match "my puppy")

### 6.2 Phase 2: pgvector Embeddings

When pgvector extension is enabled:

```sql
-- Migration to add embedding column
ALTER TABLE character_memories 
ADD COLUMN embedding vector(1024);

-- Create IVFFlat index for ANN search
CREATE INDEX idx_memory_embedding ON character_memories 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

```typescript
// Generate embeddings for new memories
async function embedMemory(content: string): Promise<number[]> {
  const embeddings = await alibabaEmbedText({
    input: [content],
    model: 'text-embedding-v4',
  });
  return embeddings[0];  // 1024-dim vector
}
```

### 6.3 Hybrid Retrieval (Phase 2)

Combine semantic similarity with metadata scoring:

```
SCORE = cosine_similarity(query_embedding, memory_embedding) × 0.60
      + importance × 0.20
      + recency × 0.10
      + reinforcement × 0.10
```

---

## 7. Memory Context Injection

### 7.1 ContextBuilder Integration

Memories are injected into the system prompt in priority order:

```typescript
// In ContextBuilderService.buildSystemPrompt():

// Retrieve scored memories
const memories = await memoryRetrievalService.retrieve(
  characterId, userId, userMessage, 8, currentConversationMemories,
);

// Filter out sensitive facts (NEVER include in prompts)
const safeMemories = memories.filter(m => m.type !== 'sensitive_fact');

// Format for prompt
if (safeMemories.length > 0) {
  const memoryLines = safeMemories.map(m => {
    const confidenceMarker = m.confidence < 0.7 ? ' [maybe]' : '';
    const typeTag = m.type === 'promise' ? ' 🔴REMEMBER:' : 
                    m.type === 'relationship_event' ? ' 💫' : ' •';
    return `${typeTag} ${m.content}${confidenceMarker}`;
  });
  
  prompt += `\n\nWHAT YOU KNOW ABOUT THEM (prioritized by relevance):\n${memoryLines.join('\n')}`;
}
```

### 7.2 Context Budget Allocation

| Component | Token Budget | Priority |
|-----------|-------------|----------|
| Identity Anchor (DNA) | ~400 tokens | Highest — always included |
| Relationship Context | ~150 tokens | High |
| Recent Chat History | ~500 tokens | High |
| Memories | ~400 tokens | Medium — trimmed to fit |
| Instructions/Formatting | ~300 tokens | Fixed |

When total tokens exceed the budget (2,048 for qwen3.5-flash), memories are truncated first, then chat history.

---

## 8. Memory Management API

### 8.1 Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/characters/:id/memories` | List all memories for this user↔character pair |
| `GET` | `/characters/:id/memories/search?q=...` | Search memories semantically |
| `DELETE` | `/characters/:id/memories/:memoryId` | Delete a specific memory |
| `DELETE` | `/characters/:id/memories` | Clear ALL memories (user action) |
| `PATCH` | `/characters/:id/memories/:memoryId` | Edit memory content |
| `GET` | `/characters/:id/memories/stats` | Memory statistics (count by type, total) |

### 8.2 User-Facing Memory View

The UI shows users what the character "remembers" about them:

```
┌─────────────────────────────────────────┐
│ What Maya remembers about you           │
├─────────────────────────────────────────┤
│ 💫 You told her you trust her with      │
│    anything — that meant a lot          │
│                                         │
│ • You're a software engineer            │
│ • You have a cat named Mochi            │
│ • You hate cilantro [maybe]             │
│ • You promised to send vacation pics    │
│ • Your birthday is March 15th           │
│ • Favorite coffee: oat milk latte       │
│                                         │
│ [Clear all memories] [Edit]             │
└─────────────────────────────────────────┘
```

---

## 9. Pseudocode: Complete Memory Lifecycle

```typescript
// Called after every user↔character exchange

async function processExchange(
  characterId: string,
  userId: string,
  conversationId: string,
  userMessage: string,
  characterResponse: string,
  consecutiveExchanges: number,
) {
  // 1. Extract memories from this exchange
  const extracted = await memoryExtractionService.extractMemories(
    userMessage,
    characterResponse,
    characterName,
    recentMemoryContents,  // Last 10 stored memories for dedup
    consecutiveExchanges,
  );
  
  // 2. Store each extracted memory (with dedup)
  for (const mem of extracted) {
    await memoryStorageService.store({
      characterId,
      userId,
      conversationId,
      content: mem.content,
      type: mem.type,
      importance: mem.importance,
      confidence: mem.confidence,
      sourceMessageIds: [],
    });
    
    // 3. If memory extraction detected a relationship shift, trigger relationship update
    if (mem.relationshipShift) {
      await relationshipService.recordEvent(
        characterId,
        userId,
        mem.relationshipShift.direction,
        mem.relationshipShift.description,
      );
    }
  }
  
  // 4. Retrieve top memories for the NEXT exchange (pre-fetch)
  // This is used in ContextBuilderService.buildContext() 
  // — not stored, just injected into the system prompt for the next response
}
```

---

## Credit Costs

| Operation | Model | Tokens | Est. Credits |
|-----------|-------|--------|-------------|
| Memory extraction (per exchange) | qwen-flash | 400 in + 300 out | 2 |
| Memory embedding (per memory) | text-embedding-v4 | ~50 tokens | 1 |
| Semantic search (per query) | text-embedding-v4 | ~30 tokens | 1 |
| Batch decay (per 1000 memories) | — | — | 0 |
