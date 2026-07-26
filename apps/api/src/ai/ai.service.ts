import { Injectable, Inject } from '@nestjs/common';
import { alibabaChatStream, alibabaChat, alibabaTTS, alibabaTextToImageWithFallback, alibabaImageToImage, alibabaTextToVideo, alibabaImageToVideo, alibabaGetVideoResult, alibabaASR } from '@itchats/ai-core';
import { getDb } from '@itchats/database';
import { messages, generationJobs, usageEvents, creditWallets, creditLedger, conversations, characterRelationships, characters } from '@itchats/database/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
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

  async *streamChat(
    userId: string,
    characterId: string | null,
    message: string,
    conversationId?: string,
    imageBase64?: string,
  ) {
    const db = getDb();
    const clientKey = randomUUID();

    let cid = conversationId;
    if (!cid && characterId) {
      const [existing] = await db.select({ id: conversations.id }).from(conversations)
        .where(and(
          eq(conversations.characterId, characterId),
          eq(conversations.createdByUserId, userId),
        )).limit(1);
      cid = existing?.id;
    }
    if (!cid) {
      const [conv] = await db.insert(conversations).values({
        type: characterId ? 'human_character' : 'human_human',
        createdByUserId: userId,
        ...(characterId ? { characterId } : {}),
      }).returning({ id: conversations.id });
      if (!conv) throw new Error('Failed to create conversation');
      cid = conv.id;
    }
    const convId: string = cid!;  // Guaranteed by creation logic above

    await db.insert(messages).values({
      conversationId: convId, senderType: 'user', senderUserId: userId,
      type: 'text', content: message, clientIdempotencyKey: clientKey,
    } as any).onConflictDoNothing();

    let systemPrompt = 'You are a helpful AI assistant on ItChats. Keep responses friendly and concise.';
    if (characterId) {
      const ctx = await this.contextBuilder.buildContext(characterId, userId, message, convId);
      systemPrompt = ctx.systemPrompt;

      yield { type: 'context', characterName: ctx.characterName, relationship: this.contextBuilder.getRelationshipSummary(ctx.relationship) };
    }

    const wallet = await db.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);
    const balance = wallet[0]?.balance ?? 0;
    const estimated = getCreditCost('qwen3.5-flash', 'llm_chat', { inputTokens: 3000, outputTokens: 500 });
    const minCharge = Math.max(estimated, 2);
    if (balance < minCharge) {
      yield { type: 'error', message: `Insufficient credits: need ${minCharge}, have ${balance}` };
      return;
    }

    const [job] = await db.insert(generationJobs).values({
      userId, characterId, generationType: 'llm_chat',
      routeKey: 'chat.standard', idempotencyKey: randomUUID(),
      requestJson: { message, systemPrompt }, status: 'processing', startedAt: new Date(),
    }).returning();

    const userContent: any = imageBase64
      ? [{ type: 'image_url', image_url: { url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}` } }, { type: 'text', text: message || 'Describe this image' }]
      : message;

    const chatMessages: { role: 'system' | 'user' | 'assistant'; content: any }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];

    let fullResponse = '';
    try {
      for await (const chunk of alibabaChatStream({
        messages: chatMessages,
        temperature: 0.85,
        maxTokens: 800,
      })) {
        fullResponse += chunk;
        yield { type: 'chunk', content: chunk };
      }
    } catch (err: any) {
      await db.update(generationJobs).set({
        status: 'failed', errorCode: 'PROVIDER_ERROR',
        errorMessageSafe: String(err.message).slice(0, 200), completedAt: new Date(),
      }).where(eq(generationJobs.id, job!.id));
      yield { type: 'error', message: 'AI generation failed. Please try again.' };
      return;
    }

    const [aiMsg] = await db.insert(messages).values({
      conversationId: convId, senderType: 'character', senderCharacterId: characterId,
      type: 'text', content: fullResponse,
    }).returning();

    await db.update(generationJobs).set({
      status: 'succeeded', responseJson: { content: fullResponse }, completedAt: new Date(),
    }).where(eq(generationJobs.id, job!.id));

    const outputTokens = Math.ceil(fullResponse.length / 4);
    const actualCost = Math.max(getCreditCost('qwen3.5-flash', 'llm_chat', { inputTokens: 3000, outputTokens: outputTokens }), 2);

    await db.insert(usageEvents).values({
      userId, characterId, generationJobId: job!.id, providerId: 'alibaba', generationType: 'llm_chat',
      inputTokens: 3000, outputTokens, providerCostUsd: '0.0005', creditsDebited: actualCost,
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

    if (characterId) {
      await this.contextBuilder.updateRelationship(characterId, userId, 'positive');
      this.extractMemory(characterId, userId, convId, message, fullResponse).catch(() => {});
    }

    yield { type: 'done', messageId: aiMsg!.id, creditsUsed: actualCost };
  }

  async getChatHistory(characterId: string, userId: string) {
    const db = getDb();
    const [conv] = await db.select({ id: conversations.id }).from(conversations)
      .where(and(
        eq(conversations.characterId, characterId),
        eq(conversations.createdByUserId, userId),
      )).limit(1);

    if (!conv) return { messages: [], conversationId: null };

    const msgs = await db.select({
      id: messages.id,
      senderType: messages.senderType,
      content: messages.content,
      type: messages.type,
      createdAt: messages.createdAt,
    }).from(messages)
      .where(eq(messages.conversationId, conv.id))
      .orderBy(sql`${messages.createdAt} ASC`)
      .limit(100);

    return { messages: msgs, conversationId: conv.id };
  }

  async generateImage(userId: string, prompt: string, model?: string) {
    const db = getDb();
    const wallet = await db.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);
    const balance = wallet[0]?.balance ?? 0;
    const cost = getCreditCost('qwen-image-2.0', 'text_to_image');
    if (balance < cost) throw new Error(`Insufficient credits: need ${cost}, have ${balance}`);

    const result = await alibabaTextToImageWithFallback({ prompt, model, size: '1024x1024' });
    if (!result?.url) throw new Error('Image generation failed — no URL returned');

    const [job] = await db.insert(generationJobs).values({
      userId, generationType: 'text_to_image', routeKey: model === 'premium' ? 'image.premium' : 'image.standard',
      idempotencyKey: randomUUID(), requestJson: { prompt, model }, status: 'succeeded',
      responseJson: { url: result.url, model: result.model }, completedAt: new Date(),
    }).returning();

    await db.insert(usageEvents).values({
      userId, generationJobId: job!.id, providerId: 'alibaba', generationType: 'text_to_image',
      imageCount: 1, providerCostUsd: '0.035', creditsDebited: cost,
      pricingSnapshot: { model: result.model || 'qwen-image-2.0', credits: cost },
    });

    await db.update(creditWallets).set({
      balance: sql`GREATEST(0, ${creditWallets.balance} - ${cost})`,
      lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${cost}`,
      updatedAt: new Date(),
    }).where(eq(creditWallets.userId, userId));

    return { url: result.url, model: result.model, creditsUsed: cost };
  }

  async generateVoice(userId: string, text: string, voice?: string) {
    const db = getDb();
    const wallet = await db.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);
    const balance = wallet[0]?.balance ?? 0;
    const cost = Math.max(getCreditCost('qwen3-tts-flash', 'tts', { characters: text.length }), 2);
    if (balance < cost) throw new Error(`Insufficient credits: need ${cost}, have ${balance}`);

    const audio = await alibabaTTS({ text, voice });
    if (!audio?.audioBase64 || audio.audioBase64.length === 0) throw new Error('TTS generation failed');

    const dataUrl = `data:audio/mp3;base64,${audio.audioBase64}`;

    const [job] = await db.insert(generationJobs).values({
      userId, generationType: 'tts', routeKey: 'tts.standard',
      idempotencyKey: randomUUID(), requestJson: { text, voice }, status: 'succeeded',
      responseJson: { audioLength: audio.audioBase64.length }, completedAt: new Date(),
    }).returning();

    await db.insert(usageEvents).values({
      userId, generationJobId: job!.id, providerId: 'alibaba', generationType: 'tts',
      inputCharacters: text.length, providerCostUsd: '0.002', creditsDebited: cost,
      pricingSnapshot: { model: voice || 'qwen3-tts-flash', credits: cost },
    });

    await db.update(creditWallets).set({
      balance: sql`GREATEST(0, ${creditWallets.balance} - ${cost})`,
      lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${cost}`,
      updatedAt: new Date(),
    }).where(eq(creditWallets.userId, userId));

    return { audioUrl: dataUrl, format: 'mp3', creditsUsed: cost };
  }

  async generateImageToImage(userId: string, prompt: string, imageBase64: string) {
    const db = getDb();
    const wallet = await db.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);
    const balance = wallet[0]?.balance ?? 0;
    const cost = getCreditCost('qwen-image-2.0', 'text_to_image') * 1.5;
    if (balance < cost) throw new Error(`Insufficient credits: need ${cost}, have ${balance}`);

    const result = await alibabaImageToImage({ prompt, imageBase64 });
    if (!result?.url) throw new Error('Image-to-image failed — no URL returned');

    const [job] = await db.insert(generationJobs).values({
      userId, generationType: 'image_to_image', routeKey: 'image.standard',
      idempotencyKey: randomUUID(), requestJson: { prompt }, status: 'succeeded',
      responseJson: { url: result.url, model: result.model }, completedAt: new Date(),
    }).returning();

    await db.update(creditWallets).set({
      balance: sql`GREATEST(0, ${creditWallets.balance} - ${cost})`,
      lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${cost}`,
      updatedAt: new Date(),
    }).where(eq(creditWallets.userId, userId));

    return { url: result.url, model: result.model, creditsUsed: cost };
  }

  async generateSelfie(userId: string, characterId: string, context?: string) {
    const db = getDb();
    const [char] = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1);
    if (!char) throw new Error('Character not found');

    const wallet = await db.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);
    const balance = wallet[0]?.balance ?? 0;
    const cost = getCreditCost('qwen-image-2.0-pro', 'text_to_image');
    if (balance < cost) throw new Error(`Insufficient credits: need ${cost}, have ${balance}`);

    const prompt = [
      `${char.name}, a ${char.gender || 'person'} in their ${char.ageDisplay || 'prime'}`,
      char.description || '',
      context || '',
      'selfie style, casual, natural lighting, portrait, looking at camera, modern smartphone selfie quality, 1 person only',
    ].filter(Boolean).join(', ');

    const result = await alibabaTextToImageWithFallback({ prompt, size: '1024*1024' });
    if (!result?.url) throw new Error('Selfie generation failed');

    await db.update(creditWallets).set({
      balance: sql`GREATEST(0, ${creditWallets.balance} - ${cost})`,
      lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${cost}`,
      updatedAt: new Date(),
    }).where(eq(creditWallets.userId, userId));

    return { url: result.url, model: result.usedModel, creditsUsed: cost };
  }

  async generateTextToVideo(userId: string, prompt: string) {
    const db = getDb();
    const wallet = await db.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);
    const balance = wallet[0]?.balance ?? 0;
    const cost = 50;
    if (balance < cost) throw new Error(`Insufficient credits: need ${cost}, have ${balance}`);

    const result = await alibabaTextToVideo({ prompt });
    return { ...result, creditsUsed: cost };
  }

  async generateImageToVideo(userId: string, prompt: string, imageBase64: string) {
    const db = getDb();
    const wallet = await db.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);
    const balance = wallet[0]?.balance ?? 0;
    const cost = 50;
    if (balance < cost) throw new Error(`Insufficient credits: need ${cost}, have ${balance}`);

    const result = await alibabaImageToVideo({ prompt, imageBase64 });
    return { ...result, creditsUsed: cost };
  }

  async getVideoResult(taskId: string) {
    return alibabaGetVideoResult(taskId);
  }

  async transcribeVoice(userId: string, audioBase64: string) {
    const db = getDb();
    const wallet = await db.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);
    const balance = wallet[0]?.balance ?? 0;
    const cost = 2;
    if (balance < cost) throw new Error(`Insufficient credits: need ${cost}, have ${balance}`);

    const result = await alibabaASR({ audioBase64 });
    return { text: result.text, language: result.language, creditsUsed: cost };
  }

  /**
   * Section 24: LLM-based memory extraction.
   * Uses a cheap model to evaluate whether the exchange contains anything worth remembering,
   * classifies it, and stores it with proper importance/confidence scores.
   */
  private async extractMemory(
    characterId: string,
    userId: string,
    conversationId: string,
    userMessage: string,
    aiResponse: string,
  ) {
    try {
      // Skip trivial exchanges
      const combined = userMessage + aiResponse;
      if (combined.length < 30) return;

      // Use cheap model for extraction per spec Section 15.2 (qwen-flash: $0.05/1M input)
      const extractionPrompt = `Analyze this conversation exchange and determine if the user revealed anything worth remembering about themselves.

USER: ${userMessage.slice(0, 400)}
AI: ${aiResponse.slice(0, 200)}

Return ONLY a JSON object (no markdown, no explanation):
{
  "hasMemory": true/false,
  "content": "What to remember (1 short sentence, max 120 chars)",
  "type": "identity_fact|preference|relationship_event|promise|recurring_topic|sensitive_fact|temporary_context",
  "importance": 0.0-1.0 (how important is this for future conversations?),
  "confidence": 0.0-1.0 (how certain are you this is accurate?)
}

Rules:
- identity_fact: name, age, location, job, family, background
- preference: likes, dislikes, favorites, opinions
- relationship_event: something meaningful between us
- promise: they committed to something
- recurring_topic: topic they bring up often
- sensitive_fact: potentially private/sensitive info — set importance LOW
- temporary_context: short-term context only, set importance LOW
- Only return hasMemory:true if there's genuinely something worth remembering. Small talk = false.`;

      const result = await alibabaChat({
        messages: [{ role: 'user', content: extractionPrompt }],
        model: 'qwen-flash',
        temperature: 0.2,
        maxTokens: 200,
      });

      const json = JSON.parse(result.content.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
      if (!json.hasMemory || !json.content || json.content.length < 3) return;

      await this.memoryService.store({
        characterId,
        userId,
        conversationId,
        content: json.content.slice(0, 300),
        memoryType: json.type || 'temporary_context',
        importance: Math.min(1, Math.max(0, Number(json.importance) || 0.4)),
        confidence: Math.min(1, Math.max(0, Number(json.confidence) || 0.5)),
        sourceMessageIds: [],
      });
    } catch {
      // Memory extraction is best-effort, never block the main flow
    }
  }

  async getMemories(characterId: string, userId: string) {
    return this.memoryService.getUserMemories(characterId, userId);
  }

  async clearMemories(characterId: string, userId: string) {
    return this.memoryService.clearMemories(characterId, userId);
  }

  async getRelationship(characterId: string, userId: string) {
    const db = getDb();
    const [rel] = await db.select().from(characterRelationships)
      .where(and(
        eq(characterRelationships.characterId, characterId),
        eq(characterRelationships.userId, userId),
      )).limit(1);

    if (!rel) return { level: 1, label: 'Stranger', familiarity: 0, trust: 0, warmth: 0, affinity: 0, tension: 0 };
    return {
      level: Math.round(Number(rel.visibleLevel) || 1),
      label: this.contextBuilder.getRelationshipSummary({
        level: Number(rel.visibleLevel) || 1,
        warmth: Number(rel.warmth) || 0,
        trust: Number(rel.trust) || 0,
        affinity: Number(rel.affinity) || 0,
        tension: Number(rel.tension) || 0,
        familiarity: Number(rel.familiarity) || 0,
      }),
      familiarity: Number(rel.familiarity) || 0,
      trust: Number(rel.trust) || 0,
      warmth: Number(rel.warmth) || 0,
      affinity: Number(rel.affinity) || 0,
      tension: Number(rel.tension) || 0,
    };
  }
}
