import { Job } from 'bullmq';
import { getDb } from '@itchats/database';
import { generationJobs, characterMemories, usageEvents, creditWallets, creditLedger } from '@itchats/database/schema';
import { eq, sql } from 'drizzle-orm';
import { alibabaChat } from '@itchats/ai-core';
import { getCreditCost } from '@itchats/ai-core/costing';
import { z } from 'zod';
import type { MemoryExtractionJob } from '../queues';

const MemorySchema = z.object({
  hasMemory: z.boolean(),
  content: z.string().max(300).optional(),
  type: z.enum([
    'identity_fact', 'preference', 'relationship_event',
    'promise', 'recurring_topic', 'sensitive_fact', 'temporary_context',
  ]).optional(),
  importance: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export async function memoryExtractionProcessor(job: Job<MemoryExtractionJob>) {
  const db = getDb();
  const { characterId, userId, userMessage, aiResponse } = job.data;

  const systemPrompt = `Analyze this conversation for memories worth keeping. Extract facts about the user, relationship events, promises, preferences, and recurring topics.

Return JSON:
{
  "hasMemory": boolean,
  "content": "concise memory text (max 300 chars)",
  "type": "identity_fact|preference|relationship_event|promise|recurring_topic|sensitive_fact|temporary_context",
  "importance": 0-1,
  "confidence": 0-1
}

Only return memories that the AI character would genuinely want to remember. Skip trivial greetings.`;

  try {
    const response = await alibabaChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `User: ${userMessage}\nAI: ${aiResponse}` },
      ],
      model: 'qwen3.5-flash',
      temperature: 0.3,
      maxTokens: 200,
    });

    let parsed: z.infer<typeof MemorySchema> | null = null;
    try {
      const jsonStr = response.content.replace(/```json\n?|\n?```/g, '').trim();
      parsed = MemorySchema.parse(JSON.parse(jsonStr));
    } catch {
      return { skipped: true, reason: 'parse-failed' };
    }

    if (!parsed.hasMemory || !parsed.content) {
      return { skipped: true, reason: 'no-memory-detected' };
    }

    await db.insert(characterMemories).values({
      characterId,
      userId,
      type: parsed.type ?? 'preference',
      content: parsed.content,
      importance: parsed.importance ?? 0.5,
      confidence: parsed.confidence ?? 0.7,
      sourceConversationId: job.data.conversationId,
      expiresAt: parsed.type === 'temporary_context'
        ? new Date(Date.now() + 7 * 86400000)
        : null,
    } as any);

    // Record minimal usage
    await db.insert(usageEvents).values({
      userId, characterId,
      generationType: 'memory_extract',
      inputTokens: 300, outputTokens: 80,
      providerCostUsd: '0.0001',
      creditsDebited: 1,
      pricingSnapshot: { model: 'qwen3.5-flash', operation: 'memory_extract' },
    });

    return { success: true, memoryId: parsed.content.slice(0, 50) };
  } catch (err: any) {
    // Memory extraction is best-effort; don't throw
    return { skipped: true, reason: `llm-error: ${String(err.message).slice(0, 100)}` };
  }
}
