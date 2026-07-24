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

  async retrieve(characterId: string, userId: string, query: string, limit = 8) {
    const db = getDb();
    // For MVP: retrieve by recency + importance since we don't have pgvector yet
    return db.select().from(characterMemories)
      .where(and(
        eq(characterMemories.characterId, characterId),
        eq(characterMemories.userId, userId),
        sql`(${characterMemories.expiresAt} IS NULL OR ${characterMemories.expiresAt} > NOW())`,
      ))
      .orderBy(
        desc(sql`${characterMemories.importance}::numeric * 0.5 + (EXTRACT(EPOCH FROM NOW() - ${characterMemories.createdAt}) / 86400.0)::numeric * 0.1`),
      )
      .limit(limit);
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
