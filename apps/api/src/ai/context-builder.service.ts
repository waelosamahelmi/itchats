import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characters, messages, conversations } from '@itchats/database/schema';
import { eq, and, asc } from 'drizzle-orm';
import { MemoryService } from './memory.service';
import { buildFullChatPrompt } from '@itchats/ai-core';
import type { SystemPromptParams } from '@itchats/ai-core';
import type { PersonalityPromptParams } from '@itchats/ai-core';
import type { MessagingPromptParams } from '@itchats/ai-core';
import type { MemoryPromptParams } from '@itchats/ai-core';
import type { RelationshipPromptParams } from '@itchats/ai-core';

export interface AssembledContext {
  systemPrompt: string;
  recentMessages: { role: string; content: string }[];
  memories: string[];
  relationship: Record<string, number>;
  characterName: string;
  characterEmotion?: string;
}

@Injectable()
export class ContextBuilderService {
  constructor(
    @Inject(forwardRef(() => MemoryService))
    private readonly memoryService: MemoryService,
  ) {}

  async buildContext(
    characterId: string,
    userId: string,
    userMessage: string,
    conversationId?: string,
  ): Promise<AssembledContext> {
    const db = getDb();

    const [char] = await db.select().from(characters)
      .where(eq(characters.id, characterId)).limit(1);
    if (!char) throw new Error('Character not found');

    // Get relationship from DB (will be superseded by RelationshipEngineService in Phase 3)
    const { characterRelationships } = await import('@itchats/database/schema');
    const [rel] = await db.select().from(characterRelationships)
      .where(and(
        eq(characterRelationships.characterId, characterId),
        eq(characterRelationships.userId, userId),
      )).limit(1);

    // Retrieve scored memories
    const retrievedMemories = await this.memoryService.retrieve(characterId, userId, userMessage, 8);
    const memoryContents = retrievedMemories.map(m => m.content);

    // Build recent message history
    const recentMessages: { role: string; content: string }[] = [];
    let conversationMode: 'chat' | 'roleplay' = 'chat';
    if (conversationId) {
      const [conversation] = await db.select({ mode: conversations.mode }).from(conversations)
        .where(eq(conversations.id, conversationId)).limit(1);
      conversationMode = conversation?.mode ?? 'chat';
      const history = await db.select({
        content: messages.content,
        senderType: messages.senderType,
      }).from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(asc(messages.createdAt))
        .limit(40);

      for (const msg of history) {
        if (msg.content) {
          recentMessages.push({
            role: msg.senderType === 'user' ? 'user' : 'assistant',
            content: msg.content.slice(0, 500),
          });
        }
      }
    }

    // Build recent exchange summary for memory context
    let recentExchange = '';
    if (recentMessages.length > 0) {
      const lastFew = recentMessages.slice(-6);
      recentExchange = lastFew.map(m =>
        `${m.role === 'user' ? 'They' : 'You'}: ${m.content.slice(0, 80)}`
      ).join(' | ');
    }

    // Calculate relationship level
    const level = rel ? Math.round(Number(rel.visibleLevel)) : 1;
    const relationshipLabel = this.getRelationshipLabel(level);
    const warmth = rel ? Number(rel.warmth) : 0;
    const trust = rel ? Number(rel.trust) : 0;
    const familiarity = rel ? Number(rel.familiarity) : 0;

    // ── Build prompt using modular prompt system ──

    const systemParams: SystemPromptParams = {
      characterName: char.name,
      personality: char.personality || '',
      backstory: char.backstory || '',
      occupation: char.occupation || undefined,
      interests: (char.interests as string[]) || [],
      languages: (char.languages as string[]) || ['en'],
      defaultLanguage: char.defaultLanguage || 'en',
      relationshipLabel,
      relationshipLevel: level,
      trust,
      warmth,
      familiarity,
      currentMood: (char.emotionState as any)?.mood || 'neutral',
      energyLevel: (char.emotionState as any)?.energy || 5,
      currentActivity: (char.emotionState as any)?.currentActivity,
      conversationMode,
    };

    const personalityParams: PersonalityPromptParams = {
      personality: char.personality || '',
      speakingStyle: char.speakingStyle || undefined,
      humorStyle: char.humorStyle || undefined,
      energyLevel: char.energyLevel ? Number(char.energyLevel) : undefined,
      confidence: char.confidence ? Number(char.confidence) : undefined,
      emotionalBaseline: char.emotionalBaseline || undefined,
      curiosity: char.curiosity ? Number(char.curiosity) : undefined,
      optimism: char.optimism ? Number(char.optimism) : undefined,
      affection: char.affection ? Number(char.affection) : undefined,
      jealousy: char.jealousy ? Number(char.jealousy) : undefined,
      ambition: char.ambition ? Number(char.ambition) : undefined,
      intelligence: char.intelligence ? Number(char.intelligence) : undefined,
      fears: (char.fears as string[]) || [],
      goals: (char.goals as string[]) || [],
      secrets: (char.secrets as string[]) || [],
    };

    const typingProfile = (char.typingProfile as any) || {};
    const messagingParams: MessagingPromptParams = {
      speakingStyle: char.speakingStyle || undefined,
      humorStyle: char.humorStyle || undefined,
      emojiStyle: char.emojiStyle || undefined,
      typingProfile: {
        averageWords: typingProfile.averageWords || 12,
        emojiFrequency: typingProfile.emojiFrequency || 1.5,
        capitalization: typingProfile.capitalization || 'mixed',
        punctuation: typingProfile.punctuation || 'normal',
        slang: typingProfile.slang || [],
        replySpeed: typingProfile.replySpeed || 'normal',
        doubleTextChance: typingProfile.doubleTextChance || 0.1,
        voiceMessageChance: typingProfile.voiceMessageChance || 0.05,
        imageChance: typingProfile.imageChance || 0.08,
      },
    };

    const memoryParams: MemoryPromptParams = {
      memories: memoryContents,
      recentExchange: recentExchange || undefined,
    };

    const relationshipParams: RelationshipPromptParams = {
      relationshipLabel,
      relationshipLevel: level,
      trust,
      warmth,
      familiarity,
      comfort: rel ? Number(rel.comfort) : undefined,
      attachment: rel ? Number(rel.attachment) : undefined,
      chemistry: rel ? Number(rel.chemistry) : undefined,
      romance: rel ? Number(rel.romance) : undefined,
      tension: rel ? Number(rel.tension) : undefined,
      sharedMemories: (rel?.sharedMemories as string[]) || [],
      insideJokes: (rel?.insideJokes as string[]) || [],
    };

    const systemPrompt = buildFullChatPrompt({
      system: systemParams,
      personality: personalityParams,
      messaging: messagingParams,
      memory: memoryParams,
      relationship: relationshipParams,
    });

    return {
      systemPrompt,
      recentMessages,
      memories: memoryContents,
      characterName: char.name,
      characterEmotion: (char.emotionState as any)?.mood ?? undefined,
      relationship: rel ? {
        familiarity: Number(rel.familiarity),
        trust: Number(rel.trust),
        warmth: Number(rel.warmth),
        affinity: Number(rel.affinity),
        tension: Number(rel.tension),
        comfort: Number(rel.comfort) || 0,
        attachment: Number(rel.attachment) || 0,
        chemistry: Number(rel.chemistry) || 0,
        romance: Number(rel.romance) || 0,
        humor: Number(rel.humor) || 0,
        level: level,
      } : {
        familiarity: 0, trust: 0, warmth: 0, affinity: 0, tension: 0,
        comfort: 0, attachment: 0, chemistry: 0, romance: 0, humor: 0, level: 1,
      },
    };
  }

  async updateRelationship(
    characterId: string,
    userId: string,
    sentiment: 'positive' | 'neutral' | 'negative',
  ) {
    const db = getDb();
    const { characterRelationships } = await import('@itchats/database/schema');
    const [existing] = await db.select().from(characterRelationships)
      .where(and(
        eq(characterRelationships.characterId, characterId),
        eq(characterRelationships.userId, userId),
      )).limit(1);

    const familiarityInc = sentiment === 'positive' ? 0.03 : sentiment === 'negative' ? -0.01 : 0.01;
    const trustInc = sentiment === 'positive' ? 0.02 : sentiment === 'negative' ? -0.02 : 0.005;
    const warmthInc = sentiment === 'positive' ? 0.03 : sentiment === 'negative' ? -0.02 : 0.005;
    const affinityInc = sentiment === 'positive' ? 0.02 : sentiment === 'negative' ? -0.01 : 0.005;
    const tensionInc = sentiment === 'negative' ? 0.03 : -0.01;
    const levelInc = sentiment === 'positive' ? 0.02 : sentiment === 'negative' ? -0.01 : 0.005;

    if (existing) {
      const newLevel = Math.min(10, Math.max(1, Number(existing.visibleLevel) + levelInc));
      await db.update(characterRelationships).set({
        visibleLevel: String(newLevel),
        familiarity: String(Math.min(1, Math.max(0, Number(existing.familiarity) + familiarityInc))),
        trust: String(Math.min(1, Math.max(0, Number(existing.trust) + trustInc))),
        warmth: String(Math.min(1, Math.max(0, Number(existing.warmth) + warmthInc))),
        affinity: String(Math.min(1, Math.max(0, Number(existing.affinity) + affinityInc))),
        tension: String(Math.min(1, Math.max(0, Number(existing.tension) + tensionInc))),
        interactionCount: existing.interactionCount + 1,
        lastInteractionAt: new Date(),
        updatedAt: new Date(),
      } as any).where(eq(characterRelationships.id, existing.id));
    } else {
      await db.insert(characterRelationships).values({
        characterId, userId,
        visibleLevel: '1.0',
        familiarity: '0.01',
        trust: '0.01',
        warmth: '0.01',
        affinity: '0.01',
        tension: '0.0',
        comfort: '0.0',
        attachment: '0.0',
        curiosity: '0.01',
        respect: '0.01',
        chemistry: '0.0',
        romance: '0.0',
        humor: '0.0',
        compatibility: '0.01',
        interactionCount: 1,
        conversationCount: 1,
        daysKnown: 1,
        lastInteractionAt: new Date(),
      } as any);
    }
  }

  getRelationshipSummary(rel: Record<string, number>): string {
    const level = Math.round(rel.level || 1);
    return this.getRelationshipLabel(level);
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
