import { Injectable, Inject } from '@nestjs/common';
import { alibabaChatStream } from '@itchats/ai-core';
import { getDb } from '@itchats/database';
import { messages, generationJobs, usageEvents, creditWallets, creditLedger } from '@itchats/database/schema';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { ContextBuilderService } from './context-builder.service';
import { MemoryService } from './memory.service';
import { getCreditCost } from '@itchats/ai-core/costing';

@Injectable()
export class AiService {
  constructor(
    @Inject(ContextBuilderService) private readonly contextBuilder: ContextBuilderService,
    @Inject(MemoryService) private readonly memoryService: MemoryService,
  ) {}

  async *streamChat(userId: string, characterId: string | null, message: string, conversationId?: string) {
    const db = getDb();
    const clientKey = randomUUID();

    // Persist user message
    await db.insert(messages).values({
      conversationId, senderType: 'user', senderUserId: userId,
      type: 'text', content: message, clientIdempotencyKey: clientKey,
    });

    // Build context
    let systemPrompt = 'You are a helpful AI assistant on ItChats. Keep responses friendly and concise.';
    if (characterId) {
      const ctx = await this.contextBuilder.buildContext(characterId, userId, message);
      systemPrompt = ctx.systemPrompt;
    }

    // Reserve credits
    const wallet = await db.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);
    const estimated = getCreditCost('qwen3.5-flash', 'llm_chat', { inputTokens: 3000, outputTokens: 500 });
    const balance = wallet[0]?.balance ?? 0;
    if (balance < Math.max(estimated, 2)) throw new Error(`Insufficient credits: need ${Math.max(estimated, 2)}, have ${balance}`);

    // Create job
    const [job] = await db.insert(generationJobs).values({
      userId, characterId, conversationId, generationType: 'llm_chat',
      routeKey: 'chat.standard', idempotencyKey: randomUUID(),
      requestJson: { message, systemPrompt }, status: 'processing', startedAt: new Date(),
    }).returning();

    // Stream
    let fullResponse = '';
    try {
      for await (const chunk of alibabaChatStream({
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
        temperature: 0.8,
      })) {
        fullResponse += chunk;
        yield { type: 'chunk', content: chunk };
      }
    } catch (err: any) {
      await db.update(generationJobs).set({ status: 'failed', errorCode: 'PROVIDER', errorMessageSafe: err.message?.slice(0, 200), completedAt: new Date() })
        .where(eq(generationJobs.id, job!.id));
      yield { type: 'error', message: 'AI generation failed' };
      return;
    }

    // Persist AI response
    const [aiMsg] = await db.insert(messages).values({
      conversationId, senderType: 'character', senderCharacterId: characterId,
      type: 'text', content: fullResponse, modelGenerationId: job!.id,
    }).returning();

    // Complete job
    await db.update(generationJobs).set({ status: 'succeeded', responseJson: { content: fullResponse }, completedAt: new Date() })
      .where(eq(generationJobs.id, job!.id));

    // Usage & billing
    const actualCost = Math.max(getCreditCost('qwen3.5-flash', 'llm_chat', { inputTokens: 3000, outputTokens: Math.ceil(fullResponse.length / 4) }), 2);
    await db.insert(usageEvents).values({
      userId, characterId, generationJobId: job!.id, providerId: 'alibaba', generationType: 'llm_chat',
      inputTokens: 3000, outputTokens: Math.ceil(fullResponse.length / 4),
      providerCostUsd: '0.0005', creditsDebited: actualCost,
      pricingSnapshot: { model: 'qwen3.5-flash', credits: actualCost },
    });
    await db.update(creditWallets).set({
      balance: sql`GREATEST(0, ${creditWallets.balance} - ${actualCost})`,
      lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${actualCost}`,
      updatedAt: new Date(),
    }).where(eq(creditWallets.userId, userId));
    await db.insert(creditLedger).values({
      userId, delta: -actualCost, balanceAfter: Math.max(0, balance - actualCost),
      reason: 'AI chat', referenceType: 'generation_job', referenceId: job!.id,
    });

    // Update relationship
    if (characterId) {
      await this.contextBuilder.updateRelationship(characterId, userId, 'positive');
      // Fire-and-forget memory extraction
      this.extractMemory(characterId, userId, conversationId, message, fullResponse).catch(() => {});
    }

    yield { type: 'done', messageId: aiMsg!.id, creditsUsed: actualCost };
  }

  private async extractMemory(cid: string | null, uid: string, convId: string | undefined, uMsg: string, aiRsp: string) {
    if (!cid) return;
    const combined = `${uMsg} ${aiRsp}`.toLowerCase();
    const kw = ['like', 'love', 'enjoy', 'favorite', 'prefer', 'hate', 'dislike'];
    if (kw.some(w => combined.includes(w))) {
      await this.memoryService.store({ characterId: cid, userId: uid, conversationId: convId, content: combined.slice(0, 300), memoryType: 'preference', importance: 0.3, confidence: 0.5 });
    }
    await this.memoryService.store({ characterId: cid, userId: uid, conversationId: convId, content: uMsg.slice(0, 200), memoryType: 'temporary_context', importance: 0.1, confidence: 0.7 });
  }
}
