import { Injectable, Inject } from '@nestjs/common';
import { alibabaChatStream, alibabaChat, alibabaTTS, alibabaTextToImageWithFallback, alibabaImageToImage, alibabaTextToVideo, alibabaImageToVideo, alibabaGetVideoResult, alibabaASR, buildSelfiePrompt } from '@itchats/ai-core';
import { getDb } from '@itchats/database';
import { messages, messageReactions, generationJobs, usageEvents, creditWallets, creditLedger, conversations, characterRelationships, characters, characterVersions } from '@itchats/database/schema';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { ContextBuilderService } from './context-builder.service';
import { MemoryService } from './memory.service';
import { RelationshipEngineService } from '../relationship-engine/relationship-engine.service';
import { DailyLifeService } from '../daily-life/daily-life.service';
import { IdentityConsistencyService } from '../identity-consistency/identity-consistency.service';
import { getCreditCost } from '@itchats/ai-core/costing';
import { z } from 'zod';

const MemoryExtractionSchema = z.object({
  hasMemory: z.boolean(),
  content: z.string().max(300).optional(),
  type: z.enum([
    'identity_fact',
    'preference',
    'relationship_event',
    'promise',
    'recurring_topic',
    'sensitive_fact',
    'temporary_context',
  ]).optional(),
  importance: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

function parseStructuredJson<T>(content: string, schema: z.ZodType<T>): T | null {
  try {
    return schema.parse(JSON.parse(content));
  } catch {
    return null;
  }
}

@Injectable()
export class AiService {
  constructor(
    @Inject(ContextBuilderService) private readonly contextBuilder: ContextBuilderService,
    @Inject(MemoryService) private readonly memoryService: MemoryService,
    @Inject(RelationshipEngineService) private readonly relationshipEngine: RelationshipEngineService,
    @Inject(DailyLifeService) private readonly dailyLife: DailyLifeService,
    @Inject(IdentityConsistencyService) private readonly identityConsistency: IdentityConsistencyService,
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
        temperature: 0.95,
        maxTokens: 200,
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

    // Strip media markers before storing the text message
    const cleanContent = fullResponse.replace(/\[SELFIE\]|\[IMAGE:\s*.*?\]|\[VIDEO:\s*.*?\]/gi, '').trim();

    const [aiMsg] = await db.insert(messages).values({
      conversationId: convId, senderType: 'character', senderCharacterId: characterId,
      type: 'text', content: cleanContent || fullResponse,
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
      // Use the new Relationship Engine for multidimensional scoring
      this.relationshipEngine.scoreAndUpdate(characterId, userId, message, fullResponse).catch(() => {});
      // Still update the simple relationship as fallback
      this.contextBuilder.updateRelationship(characterId, userId, 'positive');
      this.extractMemory(characterId, userId, convId, message, fullResponse).catch(() => {});
      // AI sometimes reacts to the user's message
      this.autoReact(convId, characterId, message).catch(() => {});
    }

    yield { type: 'done', messageId: aiMsg!.id, creditsUsed: actualCost, conversationId: convId };

    // ── Detect media markers: [SELFIE] / [IMAGE:...] yield media_request; [VIDEO:...] auto-generates ──
    yield* this.detectMediaMarkers(userId, characterId, convId, fullResponse);
  }

  // In-memory storage for pending media requests awaiting user approval.
  // Key: requestId → value: { userId, characterId, conversationId, mediaType, mediaPrompt, estimatedCredits }
  private readonly pendingMediaRequests = new Map<string, {
    userId: string;
    characterId: string;
    conversationId: string;
    mediaType: 'selfie' | 'image' | 'video';
    mediaPrompt: string;
    estimatedCredits: number;
  }>();

  /**
   * Detects [SELFIE], [IMAGE: ...] markers in the AI response and yields media_request events.
   * [VIDEO: ...] markers still auto-generate (unchanged behavior).
   */
  private async *detectMediaMarkers(
    userId: string,
    characterId: string | null,
    conversationId: string,
    aiResponse: string,
  ): AsyncGenerator<{ type: string; [key: string]: any }> {
    if (!characterId) return;

    const selfieMatch = aiResponse.match(/\[SELFIE\]/i);
    const imageMatch = aiResponse.match(/\[IMAGE:\s*(.+?)\]/i);
    const videoMatch = aiResponse.match(/\[VIDEO:\s*(.+?)\]/i);

    if (selfieMatch) {
      const requestId = randomUUID();
      const estimatedCredits = getCreditCost('qwen-image-edit-plus', 'image_to_image');

      this.pendingMediaRequests.set(requestId, {
        userId, characterId, conversationId, mediaType: 'selfie',
        mediaPrompt: 'casual_front_camera', estimatedCredits,
      });

      yield { type: 'media_request', mediaType: 'selfie', mediaPrompt: 'casual_front_camera', estimatedCredits, requestId, conversationId };
    } else if (imageMatch) {
      const description = imageMatch[1]!.trim();
      const requestId = randomUUID();
      const estimatedCredits = getCreditCost('qwen-image-2.0', 'text_to_image');

      this.pendingMediaRequests.set(requestId, {
        userId, characterId, conversationId, mediaType: 'image',
        mediaPrompt: description, estimatedCredits,
      });

      yield { type: 'media_request', mediaType: 'image', mediaPrompt: description, estimatedCredits, requestId, conversationId };
    } else if (videoMatch) {
      // [VIDEO:...] still auto-generates without confirmation
      const description = videoMatch[1]!.trim();
      yield { type: 'status', message: `Generating video: ${description}` };
      try {
        const result = await this.generateTextToVideo(userId, description);
        const videoUrl = (result as any)?.videoUrl || (result as any)?.url;
        if (videoUrl) {
          await this.saveMediaMessage(conversationId, characterId, 'video', videoUrl);
          yield { type: 'video', url: videoUrl, description, creditsUsed: result.creditsUsed };
        } else if (result?.taskId) {
          yield { type: 'video_queued', taskId: result.taskId, description, message: 'Video is being generated. It will appear shortly.' };
        }
      } catch (err: any) {
        yield { type: 'media_error', message: `Couldn't generate that video: ${String(err.message).slice(0, 100)}` };
      }
    }
  }

  /**
   * Approve or deny a pending media request.
   * If approved: generates the image/selfie, saves message, returns URL and credits used.
   * If denied: returns status 'denied'.
   */
  async approveMediaRequest(
    userId: string,
    characterId: string,
    conversationId: string,
    requestId: string,
    approved: boolean,
  ) {
    const pending = this.pendingMediaRequests.get(requestId);
    if (!pending) throw new Error('Media request not found or already processed');
    if (pending.userId !== userId) throw new Error('Unauthorized');
    if (pending.characterId !== characterId) throw new Error('Character mismatch');

    this.pendingMediaRequests.delete(requestId);

    if (!approved) {
      return { status: 'denied' as const };
    }

    // Create a generation job and spawn async work to avoid proxy timeout
    const db = getDb();
    const jobId = randomUUID();
    await db.insert(generationJobs).values({
      id: jobId,
      userId,
      characterId,
      generationType: pending.mediaType === 'selfie' ? 'image_to_image' : 'text_to_image',
      routeKey: 'chat.media.approve',
      idempotencyKey: randomUUID(),
      requestJson: { mediaType: pending.mediaType, mediaPrompt: pending.mediaPrompt },
      status: 'processing',
      startedAt: new Date(),
    });

    // Fire-and-forget: generate in background, update job when done
    (async () => {
      try {
        let result: { url: string; model: string; creditsUsed: number } | undefined;
        if (pending.mediaType === 'selfie') {
          result = await this.generateSelfie(userId, pending.characterId, pending.mediaPrompt);
        } else if (pending.mediaType === 'image') {
          result = await this.generateImage(userId, pending.mediaPrompt);
        }

        if (result?.url) {
          await this.saveMediaMessage(pending.conversationId, pending.characterId, 'image', result.url);
        }

        const d = getDb();
        await d.update(generationJobs).set({
          status: result?.url ? 'succeeded' : 'failed',
          responseJson: result || { error: 'No URL returned' },
          completedAt: new Date(),
        }).where(eq(generationJobs.id, jobId));
      } catch (err: any) {
        const d = getDb();
        await d.update(generationJobs).set({
          status: 'failed',
          errorCode: 'PROVIDER_ERROR',
          errorMessageSafe: String(err.message).slice(0, 200),
          completedAt: new Date(),
        }).where(eq(generationJobs.id, jobId));
      }
    })();

    return {
      status: 'queued' as const,
      jobId,
      mediaType: pending.mediaType,
      mediaPrompt: pending.mediaPrompt,
    };
  }

  /**
   * Get the status of a media generation job for polling.
   */
  async getMediaJobStatus(jobId: string) {
    const db = getDb();
    const [job] = await db.select().from(generationJobs).where(eq(generationJobs.id, jobId)).limit(1);
    if (!job) throw new Error('Job not found');

    const responseJson = job.responseJson as any;
    return {
      status: job.status,
      url: responseJson?.url || null,
      model: responseJson?.model || null,
      creditsUsed: responseJson?.creditsUsed || null,
      mediaType: responseJson?.mediaType || null,
      error: job.errorMessageSafe || null,
    };
  }

  private async saveMediaMessage(
    conversationId: string,
    characterId: string,
    mediaType: 'image' | 'video',
    mediaUrl: string,
  ) {
    const db = getDb();
    await db.insert(messages).values({
      conversationId,
      senderType: 'character',
      senderCharacterId: characterId,
      type: mediaType,
      content: mediaUrl,
    } as any);
  }

  async getChatHistory(characterId: string, userId: string) {
    const db = getDb();
    const [conv] = await db.select({ id: conversations.id, mode: conversations.mode }).from(conversations)
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

    const reactionRows = msgs.length ? await db.select().from(messageReactions)
      .where(inArray(messageReactions.messageId, msgs.map((message) => message.id))) : [];
    const reactionsByMessage = reactionRows.reduce<Record<string, Array<{ id: string; actorType: 'user' | 'character'; actorId: string; emoji: string }>>>((grouped, reaction) => {
      const actorId = reaction.actorUserId ?? reaction.actorCharacterId;
      if (!actorId) return grouped;
      (grouped[reaction.messageId] ??= []).push({ id: reaction.id, actorType: reaction.actorType, actorId, emoji: reaction.emoji });
      return grouped;
    }, {});

    return {
      messages: msgs.map((message) => ({ ...message, reactions: reactionsByMessage[message.id] ?? [] })),
      conversationId: conv.id,
      mode: conv.mode,
    };
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
    const cost = Math.max(getCreditCost('qwen3-tts-flash', 'tts', { chars: text.length }), 2);
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
    const cost = getCreditCost('qwen-image-edit-plus', 'image_to_image');
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

    await db.insert(usageEvents).values({
      userId, generationJobId: job!.id, providerId: 'alibaba', generationType: 'image_to_image',
      imageCount: 1, providerCostUsd: '0.0300', creditsDebited: cost,
      pricingSnapshot: { model: result.model || 'qwen-image-edit-plus', credits: cost },
    });

    return { url: result.url, model: result.model, creditsUsed: cost };
  }

  async generateSelfie(userId: string, characterId: string, context?: string) {
    const db = getDb();
    const [char] = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1);
    if (!char) throw new Error('Character not found');

    const wallet = await db.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);
    const balance = wallet[0]?.balance ?? 0;
    if (!char.avatarUrl) throw new Error('Character profile picture is required');
    const cost = getCreditCost('qwen-image-edit-plus', 'image_to_image');
    if (balance < cost) throw new Error(`Insufficient credits: need ${cost}, have ${balance}`);

    const [version] = await db.select().from(characterVersions)
      .where(eq(characterVersions.characterId, characterId)).orderBy(desc(characterVersions.version)).limit(1);
    const prompt = buildSelfiePrompt({
      characterName: char.name,
      gender: char.gender || undefined,
      ageDisplay: char.ageDisplay || undefined,
      description: char.description,
      canonicalPrompt: version?.canonicalPrompt,
      photographyStyle: char.photographyStyle || undefined,
      selfieStyle: char.selfieStyle || undefined,
      wardrobe: char.wardrobe || undefined,
      skinTone: char.skinTone || undefined,
      eyeColor: char.eyeColor || undefined,
      hair: char.hair || undefined,
      facialFeatures: char.facialFeatures || undefined,
    }, context || 'casual_front_camera');

    const referenceBase64 = await this.fetchReferenceImage(char.avatarUrl);
    const result = await alibabaImageToImage({ prompt, imageBase64: referenceBase64 });
    if (!result?.url) throw new Error('Selfie generation failed');

    const [job] = await db.insert(generationJobs).values({
      userId, characterId, generationType: 'image_to_image', routeKey: 'image.edit.private',
      idempotencyKey: randomUUID(), requestJson: { prompt, style: context, referenceUrl: char.avatarUrl },
      responseJson: { url: result.url, model: result.model }, status: 'succeeded', completedAt: new Date(),
    }).returning();

    await db.insert(usageEvents).values({
      userId, characterId, generationJobId: job!.id, providerId: 'alibaba', generationType: 'image_to_image',
      imageCount: 1, providerCostUsd: '0.0300', creditsDebited: cost,
      pricingSnapshot: { model: result.model || 'qwen-image-edit-plus', credits: cost, referenceConditioned: true },
    });

    await db.update(creditWallets).set({
      balance: sql`GREATEST(0, ${creditWallets.balance} - ${cost})`,
      lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${cost}`,
      updatedAt: new Date(),
    }).where(eq(creditWallets.userId, userId));

    return { url: result.url, model: result.model, creditsUsed: cost, referenceConditioned: true };
  }

  async generateCharacterVideo(userId: string, characterId: string, style = 'casual_front_camera') {
    const db = getDb();
    const [char] = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1);
    if (!char?.avatarUrl) throw new Error('Character profile picture is required');
    const prompt = [
      `Short realistic phone video of ${char.name}`,
      style === 'mirror_selfie' ? 'filmed through a mirror, phone naturally visible' : 'front-camera video message, natural handheld motion',
      'preserve the exact identity, facial geometry, hair, skin tone, and apparent age from the reference image',
      char.selfieStyle || char.cameraStyle || 'casual practical lighting',
      'subtle blinking and breathing, natural expression, one person only, no face morphing, no cuts, no text, five seconds',
    ].join(', ');
    const referenceBase64 = await this.fetchReferenceImage(char.avatarUrl);
    return this.generateImageToVideo(userId, prompt, referenceBase64);
  }

  private async fetchReferenceImage(url: string) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('Invalid character reference image');
    const response = await fetch(parsed, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error('Character reference image could not be loaded');
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) throw new Error('Character reference is not an image');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > 10 * 1024 * 1024) throw new Error('Character reference image is too large');
    return bytes.toString('base64');
  }

  async generateTextToVideo(userId: string, prompt: string) {
    const db = getDb();
    const wallet = await db.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);
    const balance = wallet[0]?.balance ?? 0;
    const cost = getCreditCost('wan2.6-i2v-flash', 'text_to_video', { seconds: 5, quality: '720p', hasAudio: 0 });
    if (balance < cost) throw new Error(`Insufficient credits: need ${cost}, have ${balance}`);

    const result = await alibabaTextToVideo({ prompt });

    const [job] = await db.insert(generationJobs).values({
      userId, generationType: 'text_to_video', routeKey: 'video.standard',
      idempotencyKey: randomUUID(), requestJson: { prompt }, status: 'succeeded',
      responseJson: result as any, completedAt: new Date(),
    }).returning();

    await db.insert(usageEvents).values({
      userId, generationJobId: job!.id, providerId: 'alibaba', generationType: 'text_to_video',
      videoSeconds: '5', providerCostUsd: '0.1250', creditsDebited: cost,
      pricingSnapshot: { model: 'wan2.6-i2v-flash', credits: cost, seconds: 5, quality: '720p', hasAudio: false },
    });

    await db.update(creditWallets).set({
      balance: sql`GREATEST(0, ${creditWallets.balance} - ${cost})`,
      lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${cost}`,
      updatedAt: new Date(),
    }).where(eq(creditWallets.userId, userId));

    return { ...result, creditsUsed: cost };
  }

  async generateImageToVideo(userId: string, prompt: string, imageBase64: string) {
    const db = getDb();
    const wallet = await db.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);
    const balance = wallet[0]?.balance ?? 0;
    const cost = getCreditCost('wan2.6-i2v-flash', 'image_to_video', { seconds: 5, quality: '720p', hasAudio: 0 });
    if (balance < cost) throw new Error(`Insufficient credits: need ${cost}, have ${balance}`);

    const result = await alibabaImageToVideo({ prompt, imageBase64 });

    const [job] = await db.insert(generationJobs).values({
      userId, generationType: 'image_to_video', routeKey: 'video.standard',
      idempotencyKey: randomUUID(), requestJson: { prompt }, status: 'succeeded',
      responseJson: result as any, completedAt: new Date(),
    }).returning();

    await db.insert(usageEvents).values({
      userId, generationJobId: job!.id, providerId: 'alibaba', generationType: 'image_to_video',
      videoSeconds: '5', providerCostUsd: '0.1250', creditsDebited: cost,
      pricingSnapshot: { model: 'wan2.6-i2v-flash', credits: cost, seconds: 5, quality: '720p', hasAudio: false },
    });

    await db.update(creditWallets).set({
      balance: sql`GREATEST(0, ${creditWallets.balance} - ${cost})`,
      lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${cost}`,
      updatedAt: new Date(),
    }).where(eq(creditWallets.userId, userId));

    return { ...result, creditsUsed: cost };
  }

  async getVideoResult(taskId: string) {
    return alibabaGetVideoResult(taskId);
  }

  async transcribeVoice(userId: string, audioBase64: string) {
    const db = getDb();
    const wallet = await db.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);
    const balance = wallet[0]?.balance ?? 0;
    const cost = Math.max(getCreditCost('qwen3-asr-flash', 'asr', { seconds: 30 }), 6);
    if (balance < cost) throw new Error(`Insufficient credits: need ${cost}, have ${balance}`);

    const result = await alibabaASR({ audioBase64 });

    const [job] = await db.insert(generationJobs).values({
      userId, generationType: 'asr', routeKey: 'asr.standard',
      idempotencyKey: randomUUID(), requestJson: { audioLength: audioBase64.length }, status: 'succeeded',
      responseJson: { language: result.language }, completedAt: new Date(),
    }).returning();

    await db.insert(usageEvents).values({
      userId, generationJobId: job!.id, providerId: 'alibaba', generationType: 'asr',
      audioSeconds: '30', providerCostUsd: '0.00105', creditsDebited: cost,
      pricingSnapshot: { model: 'qwen3-asr-flash', credits: cost, estimatedSeconds: 30 },
    });

    await db.update(creditWallets).set({
      balance: sql`GREATEST(0, ${creditWallets.balance} - ${cost})`,
      lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${cost}`,
      updatedAt: new Date(),
    }).where(eq(creditWallets.userId, userId));

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

      const json = parseStructuredJson(result.content, MemoryExtractionSchema);
      if (!json) return;
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

  /** AI character automatically reacts to user messages with emoji */
  private async autoReact(conversationId: string, characterId: string, userMessage: string) {
    try {
      const msg = userMessage.toLowerCase();
      let emoji: string | null = null;

      if (/😂|haha|lol|lmao|funny|joke/.test(msg)) emoji = '😂';
      else if (/❤️|love|ily|adorable|cute|sweet/.test(msg)) emoji = '❤️';
      else if (/🔥|fire|amazing|awesome|dope|lit/.test(msg)) emoji = '🔥';
      else if (/😢|sad|cry|miss|crying|broke/.test(msg)) emoji = '😢';
      else if (/😮|wow|omg|no way|really\?|what\?/.test(msg)) emoji = '😮';
      else if (/👍|ok|sure|fine|alright|bet/.test(msg)) emoji = '👍';
      else if (/👏|well done|congrats|proud/.test(msg)) emoji = '👏';

      if (!emoji) return;

      const db = getDb();
      // Find the latest user message in this conversation
      const [latestMsg] = await db.select({ id: messages.id }).from(messages)
        .where(and(eq(messages.conversationId, conversationId), eq(messages.senderType, 'user')))
        .orderBy(sql`${messages.createdAt} DESC`)
        .limit(1);

      if (!latestMsg) return;

      await db.insert(messageReactions).values({
        messageId: latestMsg.id,
        actorType: 'character',
        actorCharacterId: characterId,
        emoji,
      }).onConflictDoUpdate({
        target: [messageReactions.messageId, messageReactions.actorCharacterId],
        set: { emoji, updatedAt: new Date() },
      });
    } catch {
      // Non-critical, never block the main flow
    }
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
