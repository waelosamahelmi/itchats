import { Injectable } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characterMemories, characters } from '@itchats/database/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export interface MemoryInput {
  characterId: string;
  userId: string;
  conversationId?: string;
  content: string;
  memoryType: 'identity_fact' | 'preference' | 'relationship_event' | 'promise' | 'recurring_topic' | 'temporary_context' | 'sensitive_fact';
  importance?: number;
  confidence?: number;
  sourceMessageIds?: string[];
}

@Injectable()
export class MemoryService {
  async store(input: MemoryInput) {
    const db = getDb();
    const [existing] = await db.select().from(characterMemories)
      .where(and(
        eq(characterMemories.characterId, input.characterId),
        eq(characterMemories.userId, input.userId),
        eq(characterMemories.content, input.content),
      )).limit(1);

    if (existing) {
      // Merge: increase confidence and update timestamp
      await db.update(characterMemories).set({
        confidence: sql`LEAST(1.0, ${existing.confidence} + 0.1)`,
        importance: sql`GREATEST(${existing.importance}, ${input.importance ?? 0.5})`,
        recallCount: sql`${existing.recallCount} + 1`,
        lastRecalledAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(characterMemories.id, existing.id));
      return existing;
    }

    const [mem] = await db.insert(characterMemories).values({
      characterId: input.characterId,
      userId: input.userId,
      conversationId: input.conversationId,
      content: input.content,
      memoryType: input.memoryType,
      importance: input.importance?.toString() ?? '0.5',
      confidence: input.confidence?.toString() ?? '0.5',
      sourceMessageIds: input.sourceMessageIds ?? [],
      expiresAt: input.memoryType === 'temporary_context'
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) as any
        : null,
    }).returning();
    return mem;
  }

  /**
   * Section 24.3: Retrieve top memories ranked by combined score.
   * Formula: semantic_similarity * 0.50 + importance * 0.25 + recency_score * 0.15 + relationship_relevance * 0.10
   * For MVP without pgvector, uses importance + recency scoring with content overlap for relevance.
   */
  async retrieve(characterId: string, userId: string, query: string, limit = 8) {
    const db = getDb();
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    // Get all active memories
    const allMemories = await db.select().from(characterMemories)
      .where(and(
        eq(characterMemories.characterId, characterId),
        eq(characterMemories.userId, userId),
        sql`(${characterMemories.expiresAt} IS NULL OR ${characterMemories.expiresAt} > NOW())`,
      ))
      .orderBy(desc(characterMemories.createdAt))
      .limit(50);

    if (allMemories.length === 0) return [];

    // Score each memory
    const now = Date.now();
    const scored = allMemories.map(m => {
      const content = (m.content || '').toLowerCase();
      
      // Content relevance: how many query terms appear in the memory
      const matchCount = queryTerms.filter(t => content.includes(t)).length;
      const relevance = queryTerms.length > 0 ? matchCount / queryTerms.length : 0.25;
      
      // Recency: days ago (0 = today, capped at 30 days)
      const ageDays = Math.min(30, (now - new Date(m.createdAt).getTime()) / (86400000));
      const recencyScore = Math.max(0, 1 - ageDays / 30);
      
      // Importance from DB
      const importance = Number(m.importance) || 0.5;
      
      // Combined score per spec Section 24.3
      const score = relevance * 0.50 + importance * 0.25 + recencyScore * 0.15 + (Number(m.recallCount || 0) > 0 ? 0.10 : 0.05);
      
      return { memory: m, score };
    });

    // Sort by score descending, return top N
    scored.sort((a, b) => b.score - a.score);
    
    // Update recall counts for retrieved memories
    const topMemories = scored.slice(0, limit);
    for (const { memory } of topMemories) {
      db.update(characterMemories).set({
        lastRecalledAt: new Date(),
        recallCount: sql`${characterMemories.recallCount} + 1`,
        updatedAt: new Date(),
      }).where(eq(characterMemories.id, memory.id)).execute().catch(() => {});
    }

    return topMemories.map(({ memory, score }) => ({
      id: memory.id,
      content: memory.content,
      type: memory.memoryType,
      importance: Number(memory.importance),
      confidence: Number(memory.confidence),
      score: Math.round(score * 100) / 100,
      createdAt: memory.createdAt,
    }));
  }

  async getUserMemories(characterId: string, userId: string) {
    const db = getDb();
    return db.select().from(characterMemories)
      .where(and(eq(characterMemories.characterId, characterId), eq(characterMemories.userId, userId)))
      .orderBy(desc(characterMemories.createdAt))
      .limit(50);
  }

  async deleteMemory(memoryId: string, userId: string) {
    const db = getDb();
    await db.delete(characterMemories).where(
      and(eq(characterMemories.id, memoryId), eq(characterMemories.userId, userId)),
    );
    return { deleted: true };
  }

  async clearMemories(characterId: string, userId: string) {
    const db = getDb();
    await db.delete(characterMemories).where(
      and(eq(characterMemories.characterId, characterId), eq(characterMemories.userId, userId)),
    );
    return { cleared: true };
  }
}
