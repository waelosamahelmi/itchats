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
import { z } from 'zod';

const CharacterAutofillSchema = z.object({
  name: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  appearance: z.string().max(500).optional(),
  personality: z.string().max(2000).optional(),
  backstory: z.string().max(2000).optional(),
  ageDisplay: z.string().max(50).optional(),
  gender: z.string().max(50).optional(),
  pronouns: z.string().max(50).optional(),
  occupation: z.string().max(100).optional(),
  interests: z.array(z.string().max(100)).max(20).optional(),
  speakingStyle: z.string().max(500).optional(),
});

function parseStructuredJson<T>(content: string, schema: z.ZodType<T>): T | null {
  try {
    return schema.parse(JSON.parse(content));
  } catch {
    return null;
  }
}

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

    const json = parseStructuredJson(result.content, CharacterAutofillSchema);
    if (json) {
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
    }

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

    // Build a highly specific image prompt for character portrait
    const genderLabel = gender || 'person';
    const ageLabel = ageDisplay || 'young adult';
    const appearanceDesc = appearance ? appearance.substring(0, 200) : (char.description || '').substring(0, 200);
    const personalityDesc = (char.personality || '').substring(0, 100);

    const imagePrompt = [
      `A photorealistic portrait photo of a ${genderLabel} in their ${ageLabel}`,
      appearanceDesc || `${genderLabel} with natural features, expressive eyes, authentic look`,
      occupation ? `wearing attire suitable for a ${occupation}` : 'wearing casual, modern clothing',
      personalityDesc ? `expression reflecting: ${personalityDesc}` : 'natural, engaging expression',
      'professional headshot photography style',
      'soft cinematic lighting, shallow depth of field, sharp focus on face',
      'neutral warm-toned background, 8K quality, ultra-detailed skin texture',
    ].filter(Boolean).join('. ');

    // Update character status to generating
    await db.update(characters).set({ status: 'generating_identity' as any })
      .where(eq(characters.id, characterId));

    try {
      const cost = getCreditCost('qwen-image-2.0-pro', 'text_to_image');
      const [wallet] = await db.select().from(creditWallets).where(eq(creditWallets.userId, ownerUserId)).limit(1);
      if ((wallet?.balance ?? 0) < cost) throw new Error(`Insufficient credits: need ${cost}`);

      const result = await alibabaTextToImageWithFallback({ prompt: imagePrompt, size: '1024*1024' });

      // Update character directly with the avatar URL (actual DB column is avatar_url)
      await db.execute(sql`
        UPDATE characters SET avatar_url = ${result.url}, status = 'ready', identity_version = identity_version + 1, updated_at = NOW()
        WHERE id = ${characterId}
      `);

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
    } catch {
      // Revert to draft on failure
      await db.update(characters).set({ status: 'draft' as any })
        .where(eq(characters.id, characterId));
      throw new BadRequestException('Image generation failed. Please try again.');
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

  /**
   * Section 2.3 / 13.4: Regenerate public-safe visual identity for a private character
   * whose identity originated from an uploaded reference or image-to-image.
   * Preserves personality/backstory, creates new text-generated identity lineage.
   */
  async regeneratePublicIdentity(characterId: string, ownerUserId: string) {
    const db = getDb();
    const [char] = await db.select().from(characters)
      .where(and(eq(characters.id, characterId), eq(characters.ownerUserId, ownerUserId)))
      .limit(1);

    if (!char) throw new BadRequestException('Character not found');
    if (char.visibility !== 'private') throw new BadRequestException('Only private characters can regenerate for public use');
    if (char.identityOrigin !== 'private_uploaded_reference' && char.identityOrigin !== 'private_image_to_image') {
      throw new BadRequestException('This character already has a text-generated identity — no regeneration needed');
    }

    // Build a text-based visual description from existing character attributes
    const genderText = char.gender || '';
    const ageText = char.ageDisplay || 'young adult';
    const descText = char.description || char.personality || '';

    const visualPrompt = [
      'photorealistic portrait of a',
      genderText || 'person',
      ageText ? `in their ${ageText}` : '',
      descText ? `with ${descText.substring(0, 150)}` : '',
      'professional headshot, studio lighting, sharp focus, neutral background',
    ].filter(Boolean).join(' ');

    // Generate the new public-safe identity image
    const cost = getCreditCost('qwen-image-2.0-pro', 'text_to_image');
    const [wallet] = await db.select().from(creditWallets).where(eq(creditWallets.userId, ownerUserId)).limit(1);
    if ((wallet?.balance ?? 0) < cost) throw new BadRequestException(`Insufficient credits: need ${cost}, have ${wallet?.balance ?? 0}`);

    const result = await alibabaTextToImageWithFallback({ prompt: visualPrompt, size: '1024*1024' });

    // Update character with regenerated public-safe identity
    await db.execute(sql`
      UPDATE characters 
      SET avatar_url = ${result.url},
          identity_origin = 'public_regenerated_from_private_metadata',
          identity_version = identity_version + 1,
          status = 'ready',
          updated_at = NOW()
      WHERE id = ${characterId}
    `);

    // Record usage
    await db.insert(usageEvents).values({
      userId: ownerUserId,
      characterId,
      generationType: 'text_to_image',
      providerId: 'alibaba',
      imageCount: 1,
      providerCostUsd: '0.075',
      creditsDebited: cost,
      pricingSnapshot: { model: result.usedModel || 'qwen-image-2.0-pro', credits: cost, reason: 'public_identity_regeneration' },
    } as any);

    // Debit wallet
    await db.update(creditWallets).set({
      balance: sql`GREATEST(0, ${creditWallets.balance} - ${cost})`,
      lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${cost}`,
      updatedAt: new Date(),
    }).where(eq(creditWallets.userId, ownerUserId));

    return {
      url: result.url,
      model: result.usedModel || 'qwen-image-2.0-pro',
      identityOrigin: 'public_regenerated_from_private_metadata' as const,
      status: 'ready',
      message: 'Identity regenerated. You can now publish this character as public.',
    };
  }
}
