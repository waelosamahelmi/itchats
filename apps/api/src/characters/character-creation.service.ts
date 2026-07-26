import { Injectable, BadRequestException } from '@nestjs/common';
import { getDb } from '@itchats/database';
import {
  characters, characterVersions, characterVoiceProfiles, characterLocations,
  characterReferenceAssets, mediaAssets, creditWallets, generationJobs, usageEvents,
} from '@itchats/database/schema';
import { eq, and, sql } from 'drizzle-orm';
import { CreateCharacterSchema, type CreateCharacterInput } from '@itchats/contracts';
import { getCreditCost } from '@itchats/ai-core/costing';
import { alibabaChat, alibabaTextToImageWithFallback } from '@itchats/ai-core';
import { randomUUID } from 'node:crypto';

@Injectable()
export class CharacterCreationService {
  async createCharacter(input: CreateCharacterInput, ownerUserId: string) {
    const parsed = CreateCharacterSchema.parse(input);

    // Check plan limits
    const db = getDb();
    const [wallet] = await db.select().from(creditWallets).where(eq(creditWallets.userId, ownerUserId)).limit(1);
    const balance = wallet?.balance ?? 0;

    // Public characters require credits for reference pack generation
    if (parsed.visibility === 'public') {
      const estimatedCost = 1600; // 4-image reference pack
      if (balance < estimatedCost) {
        throw new BadRequestException(`Insufficient credits for public character creation. Need ${estimatedCost}, have ${balance}`);
      }
    }

    const identityOrigin = parsed.visibility === 'public'
      ? 'text_generated'
      : 'private_text_generated';

    const [character] = await db.insert(characters).values({
      ownerUserId,
      name: parsed.name,
      handle: parsed.handle,
      visibility: parsed.visibility,
      description: parsed.description ?? '',
      personality: parsed.personality ?? '',
      backstory: parsed.backstory ?? '',
      ageDisplay: parsed.ageDisplay,
      gender: parsed.gender,
      pronouns: parsed.pronouns,
      occupation: parsed.occupation,
      interests: parsed.interests ?? [],
      languages: parsed.languages ?? ['en'],
      defaultLanguage: parsed.defaultLanguage ?? 'en',
      identityOrigin,
      status: 'draft',
      autonomyConfig: parsed.autonomyLevel ? { level: parsed.autonomyLevel, cadence: parsed.storyCadence } : {},
    }).returning();

    // Save location (non-fatal if table mismatch)
    if (parsed.city || parsed.countryCode) {
      try {
        await db.insert(characterLocations).values({
          characterId: character!.id,
          city: parsed.city,
          countryCode: parsed.countryCode,
          timezone: parsed.timezone,
          source: 'declared',
        } as any);
      } catch { /* location table may have schema mismatch — non-fatal */ }
    }

    return character;
  }

  async autofillCharacter(name: string, concept: string) {
    const isRandom = !name || concept === 'random character';
    const seed = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const prompt = isRandom
      ? `Create a random character (seed: ${seed}). Return ONLY valid JSON, nothing else:\n{"name":"Name","description":"Short 1-line bio","appearance":"Physical look 1 sentence","personality":"Vibe 1 sentence","backstory":"Origin 1 sentence"}`
      : `Character: "${name}". Concept: "${concept}". Return ONLY valid JSON:\n{"description":"Short 1-line bio","appearance":"Physical look 1 sentence","personality":"Vibe 1 sentence","backstory":"Origin 1 sentence"}`;

    const result = await alibabaChat({
      messages: [{ role: 'user', content: prompt }],
      model: 'qwen-plus',
      temperature: 1.2,
      maxTokens: 150,
    });

    try {
      const json = JSON.parse(result.content.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
      return {
        name: isRandom ? (json.name ?? name) : name,
        personality: json.personality ?? '',
        description: json.description ?? '',
        appearance: json.appearance ?? json.description ?? '',
        backstory: json.backstory ?? '',
        ageDisplay: json.ageDisplay ?? '',
        gender: json.gender ?? '',
        pronouns: json.pronouns ?? '',
        occupation: json.occupation ?? '',
        interests: Array.isArray(json.interests) ? json.interests : [],
        speakingStyle: json.speakingStyle ?? '',
        estimatedCredits: getCreditCost('qwen3.5-flash', 'llm_chat', { inputTokens: 200, outputTokens: 300 }),
      };
    } catch {
      return {
        name: isRandom ? 'Mystery Character' : name,
        personality: 'Friendly and curious',
        description: 'A unique individual with their own style',
        backstory: 'Living their life one day at a time',
        ageDisplay: '20s',
        gender: '',
        pronouns: 'they/them',
        occupation: '',
        interests: [],
        speakingStyle: 'casual',
        estimatedCredits: getCreditCost('qwen3.5-flash', 'llm_chat', { inputTokens: 200, outputTokens: 300 }),
      };
    }
  }

  async generateCharacterImage(characterId: string, ownerUserId: string) {
    const db = getDb();
    const [char] = await db.select().from(characters)
      .where(and(eq(characters.id, characterId), eq(characters.ownerUserId, ownerUserId)))
      .limit(1);
    if (!char) throw new BadRequestException('Character not found');

    // Build a detailed image prompt from character attributes
    const gender = char.gender || '';
    const ageDisplay = char.ageDisplay || 'young adult';
    const appearance = char.description || '';
    const personality = char.personality || '';
    const occupation = char.occupation || '';

    const imagePrompt = [
      'professional character portrait, photorealistic, high quality',
      gender ? `${gender}, ${ageDisplay}` : ageDisplay,
      appearance ? appearance.substring(0, 200) : '',
      occupation ? `dressed as ${occupation}` : '',
      'cinematic lighting, 8k, sharp focus, detailed face',
      'neutral background, studio quality, professional headshot',
    ].filter(Boolean).join(', ');

    // Update character status to generating
    await db.update(characters).set({ status: 'generating_identity' as any })
      .where(eq(characters.id, characterId));

    try {
      const cost = getCreditCost('qwen-image-2.0-pro', 'text_to_image');
      const [wallet] = await db.select().from(creditWallets).where(eq(creditWallets.userId, ownerUserId)).limit(1);
      if ((wallet?.balance ?? 0) < cost) throw new Error(`Insufficient credits: need ${cost}`);

      const result = await alibabaTextToImageWithFallback({ prompt: imagePrompt, size: '1024*1024' });

      // Store as reference asset
      const [ref] = await db.insert(characterReferenceAssets).values({
        characterId,
        mediaUrl: result.url,
        mediaType: 'image/png',
        approved: true as any,
        qualityScore: 85,
        generationJobId: null,
        prompt: imagePrompt,
      } as any).returning();

      // Update character with avatar and status
      await db.update(characters).set({
        avatarMediaId: ref?.id,
        status: 'ready' as any,
        identityVersion: sql`${characters.identityVersion} + 1`,
      }).where(eq(characters.id, characterId));

      // Record usage
      await db.insert(usageEvents).values({
        userId: ownerUserId,
        characterId,
        generationType: 'text_to_image',
        providerId: 'alibaba',
        imageCount: 1,
        providerCostUsd: '0.035',
        creditsDebited: cost,
        pricingSnapshot: { model: result.usedModel || 'qwen-image-2.0-pro', credits: cost },
      } as any);

      // Debit wallet
      await db.update(creditWallets).set({
        balance: sql`GREATEST(0, ${creditWallets.balance} - ${cost})`,
        lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${cost}`,
        updatedAt: new Date(),
      }).where(eq(creditWallets.userId, ownerUserId));

      return { url: result.url, model: result.usedModel, status: 'ready' };
    } catch (err: any) {
      // Revert to draft on failure
      await db.update(characters).set({ status: 'draft' as any })
        .where(eq(characters.id, characterId));
      throw new BadRequestException(`Image generation failed: ${err.message}`);
    }
  }

  async publishCharacter(characterId: string, ownerUserId: string) {
    const db = getDb();
    const [char] = await db.select().from(characters)
      .where(and(eq(characters.id, characterId), eq(characters.ownerUserId, ownerUserId)))
      .limit(1);

    if (!char) throw new BadRequestException('Character not found');
    if (char.visibility !== 'public') throw new BadRequestException('Only public characters can be published');
    if (char.identityOrigin === 'private_uploaded_reference' || char.identityOrigin === 'private_image_to_image') {
      throw new BadRequestException('Characters with private-uploaded identity must regenerate their visual identity before publishing');
    }

    // Check for approved reference assets
    const refs = await db.select().from(characterReferenceAssets)
      .where(and(eq(characterReferenceAssets.characterId, characterId), eq(characterReferenceAssets.approved, true as any)))
      .limit(1);

    if (refs.length === 0) {
      throw new BadRequestException('Character needs approved reference images before publishing');
    }

    await db.update(characters).set({
      status: 'published',
      publishedAt: new Date(),
    }).where(eq(characters.id, characterId));

    return { published: true, characterId };
  }
}
