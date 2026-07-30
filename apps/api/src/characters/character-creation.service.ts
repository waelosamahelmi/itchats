import { Injectable, BadRequestException } from '@nestjs/common';
import { getDb } from '@itchats/database';
import {
  characters, characterVersions, characterVoiceProfiles, characterLocations,
  characterReferenceAssets, mediaAssets, creditWallets, generationJobs, usageEvents,
  characterAutonomy, creditLedger,
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
  nationality: z.string().max(100).optional(),
  ethnicity: z.string().max(100).optional(),
  height: z.string().max(20).optional(),
  bodyType: z.string().max(50).optional(),
  eyeColor: z.string().max(50).optional(),
  hair: z.string().max(200).optional(),
  skinTone: z.string().max(50).optional(),
  humorStyle: z.string().max(200).optional(),
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

    const db = getDb();
    const [wallet] = await db.select().from(creditWallets).where(eq(creditWallets.userId, ownerUserId)).limit(1);
    const balance = wallet?.balance ?? 0;

    if (parsed.visibility === 'public') {
      const estimatedCost = 1600;
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

    // Store voice selection if provided (from raw body, not in contract schema)
    const voiceKey = (input as any).voiceKey;
    if (voiceKey) {
      try {
        await db.insert(characterVoiceProfiles).values({
          characterId: character!.id,
          voiceKey: voiceKey,
          providerId: 'alibaba',
          active: 'true',
        } as any);
      } catch { /* non-fatal */ }
    }

    // ── Media Budget ──
    const mbType = parsed.mediaBudgetType ?? 'monthly';
    const maxImages = parsed.maxImagesPerPeriod ?? 0;
    const maxVideos = parsed.maxVideosPerPeriod ?? 0;
    const mbCredits = parsed.mediaBudgetCredits ?? 0;
    const budgetActive = (maxImages > 0 || maxVideos > 0);

    if (budgetActive && mbCredits > 0) {
      // Validate balance before committing
      if (balance < mbCredits) {
        throw new BadRequestException(
          `Insufficient credits for media budget. Need ${mbCredits} credits, have ${balance}. Reduce images/videos or add credits.`,
        );
      }

      // Deduct initial period credits
      await db.update(creditWallets).set({
        balance: sql`GREATEST(0, ${creditWallets.balance} - ${mbCredits})`,
        lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${mbCredits}`,
        updatedAt: new Date(),
      }).where(eq(creditWallets.userId, ownerUserId));

      const [updatedWallet] = await db.select({ balance: creditWallets.balance })
        .from(creditWallets).where(eq(creditWallets.userId, ownerUserId)).limit(1);

      await db.insert(creditLedger).values({
        userId: ownerUserId,
        delta: -mbCredits,
        balanceAfter: updatedWallet?.balance ?? 0,
        reason: `Media budget initial deduction: ${maxImages} images, ${maxVideos} videos (${mbType})`,
        referenceType: 'character_media_budget',
        referenceId: character!.id,
        metadata: { imagesPerPeriod: maxImages, videosPerPeriod: maxVideos, periodType: mbType },
      } as any);
    }

    const now = new Date();
    const periodMs = mbType === 'weekly' ? 7 * 86400000 : 30 * 86400000;
    const nextRenewal = new Date(now.getTime() + periodMs);

    try {
      await db.insert(characterAutonomy).values({
        characterId: character!.id,
        mediaBudgetType: mbType,
        maxImagesPerPeriod: maxImages,
        maxVideosPerPeriod: maxVideos,
        mediaBudgetCredits: mbCredits,
        mediaBudgetActive: budgetActive,
        mediaBudgetStartAt: budgetActive ? now : undefined,
        mediaBudgetNextRenewalAt: budgetActive ? nextRenewal : undefined,
      } as any);
    } catch { /* autonomy insert may fail if using older schema — non-fatal */ }

    return character;
  }

  async autofillCharacter(name: string, concept: string) {
    const isRandom = !name || concept === 'random character';
    const seed = Date.now().toString(36) + Math.random().toString(36).slice(2, 10) + randomUUID().slice(0, 8);

    if (isRandom) {
      const genders = ['Female', 'Male', 'Non-binary'];
      const ages = ['early 20s', 'mid 20s', 'late 20s', 'early 30s', 'mid 30s', 'late 30s', 'early 40s', 'mid 40s'];
      const cultures = ['Japanese', 'Nigerian', 'Brazilian', 'Indian', 'Korean', 'Egyptian', 'Mexican', 'Swedish', 'Moroccan', 'Thai', 'Turkish', 'Italian', 'Polish', 'Vietnamese', 'Colombian', 'Ethiopian', 'Greek', 'Malaysian'];
      const randomGender = genders[Math.floor(Math.random() * genders.length)];
      const randomAge = ages[Math.floor(Math.random() * ages.length)];
      const randomCulture = cultures[Math.floor(Math.random() * cultures.length)];

      const prompt = `Generate a COMPLETELY UNIQUE fictional character. Seed: "${seed}". Gender: ${randomGender}. Age: ${randomAge}. REQUIRED CULTURE: ${randomCulture} — pick a name and background from this specific culture.

RULES:
- The name MUST be a realistic ${randomCulture} name (first and last)
- NEVER use: Kaelen, Voss, Aria, Nova, Kai, Zephyr, Lyra, Orion, Sage, Quinn, Ryder, Ash, Rowan, Finn, River, Sky, Wren, Ember, Phoenix
- Pick an UNUSUAL profession: e.g. marine biologist, blacksmith, ethical hacker, perfumer, puppeteer, volcanologist, luthier, sommelier, beekeeper, forensic accountant

Return ONLY valid JSON, nothing else:
{"name":"First Last","gender":"${randomGender}","ageDisplay":"${randomAge}","pronouns":"they/them","description":"Short distinctive 1-line bio","appearance":"Physical look 1 sentence — be specific about hair, eyes, build, style, ethnicity","personality":"Vibe 1-2 sentences — what makes them unique","backstory":"Origin 1-2 sentences — where they came from","occupation":"Specific job title","interests":["3-5 specific interests"],"speakingStyle":"e.g. casual with dad jokes, formal and precise, uses lots of slang","humorStyle":"e.g. dry wit, playful teasing, dark humor, puns","nationality":"${randomCulture}","ethnicity":"specific ${randomCulture} ethnicity","height":"in cm, e.g. 168cm","bodyType":"e.g. athletic, slim, curvy, broad-shouldered","eyeColor":"e.g. hazel, dark brown, green","hair":"color, texture, length, style","skinTone":"e.g. warm olive, fair with freckles, deep brown"}`;

      const result = await alibabaChat({
        messages: [
          { role: 'system', content: 'You are a creative character generator. NEVER repeat names. Every generation must be completely unique. Pick from the cultures and professions listed. Be unexpected.' },
          { role: 'user', content: prompt },
        ],
        model: 'qwen-flash',
        temperature: 1.99,
        maxTokens: 400,
      });

      const json = parseStructuredJson(result.content, CharacterAutofillSchema);
      if (json) {
        return {
          name: json.name ?? 'Mystery Character',
          personality: json.personality ?? '',
          description: json.description ?? '',
          appearance: json.appearance ?? json.description ?? '',
          backstory: json.backstory ?? '',
          ageDisplay: json.ageDisplay ?? randomAge,
          gender: json.gender ?? randomGender,
          pronouns: json.pronouns ?? 'they/them',
          occupation: json.occupation ?? '',
          interests: Array.isArray(json.interests) ? json.interests : [],
          speakingStyle: json.speakingStyle ?? '',
          humorStyle: json.humorStyle ?? '',
          nationality: json.nationality ?? '',
          ethnicity: json.ethnicity ?? '',
          height: json.height ?? '',
          bodyType: json.bodyType ?? '',
          eyeColor: json.eyeColor ?? '',
          hair: json.hair ?? '',
          skinTone: json.skinTone ?? '',
          estimatedCredits: getCreditCost('qwen3.5-flash', 'llm_chat', { inputTokens: 400, outputTokens: 600 }),
        };
      }
      return {
        name: 'Mystery Character',
        personality: 'Friendly and curious',
        description: 'A unique individual with their own style',
        backstory: 'Living their life one day at a time',
        ageDisplay: randomAge,
        gender: randomGender,
        pronouns: 'they/them',
        occupation: '',
        interests: [],
        speakingStyle: 'casual',
        humorStyle: '',
        nationality: '',
        ethnicity: '',
        height: '',
        bodyType: '',
        eyeColor: '',
        hair: '',
        skinTone: '',
        estimatedCredits: getCreditCost('qwen3.5-flash', 'llm_chat', { inputTokens: 400, outputTokens: 600 }),
      };
    }

    const prompt = `Character: "${name}". Concept: "${concept}". Return ONLY valid JSON:\n{"description":"Short 1-line bio","appearance":"Physical look 1 sentence","personality":"Vibe 1 sentence","backstory":"Origin 1 sentence"}`;

    const result = await alibabaChat({
      messages: [{ role: 'user', content: prompt }],
      model: 'qwen-plus',
      temperature: 1.2,
      maxTokens: 300,
    });

    const json = parseStructuredJson(result.content, CharacterAutofillSchema);
    if (json) {
      return {
        name: name,
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
      name: name,
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

    const gender = char.gender || '';
    const ageDisplay = char.ageDisplay || 'young adult';
    const appearance = char.description || '';
    const personality = char.personality || '';
    const occupation = char.occupation || '';

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

    await db.update(characters).set({ status: 'generating_identity' as any })
      .where(eq(characters.id, characterId));

    try {
      const cost = getCreditCost('qwen-image-2.0-pro', 'text_to_image');
      const [wallet] = await db.select().from(creditWallets).where(eq(creditWallets.userId, ownerUserId)).limit(1);
      if ((wallet?.balance ?? 0) < cost) throw new Error(`Insufficient credits: need ${cost}`);

      const result = await alibabaTextToImageWithFallback({ prompt: imagePrompt, size: '1024*1024' });

      await db.update(characters).set({
        avatarUrl: result.url,
        status: 'ready',
        identityVersion: char.identityVersion + 1,
        updatedAt: new Date(),
      }).where(eq(characters.id, characterId));

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

      await db.update(creditWallets).set({
        balance: sql`GREATEST(0, ${creditWallets.balance} - ${cost})`,
        lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${cost}`,
        updatedAt: new Date(),
      }).where(eq(creditWallets.userId, ownerUserId));

      return { url: result.url, model: result.usedModel, status: 'ready' };
    } catch {
      await db.update(characters).set({ status: 'draft' as any })
        .where(eq(characters.id, characterId));
      throw new BadRequestException('Image generation failed. Please try again.');
    }
  }

  /**
   * Generate AI profile picture for a character, with NSFW filter for public characters.
   */
  async generateProfilePicture(characterId: string) {
    const db = getDb();
    const [char] = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1);
    if (!char) throw new BadRequestException('Character not found');

    const isPublic = char.visibility === 'public';

    const nsfwFilter = isPublic
      ? 'safe for work, appropriate, professional, no nudity, no explicit content, fully clothed, modest attire'
      : '';

    const imagePrompt = [
      `A photorealistic portrait of ${char.name}, a ${char.gender || 'person'} in their ${char.ageDisplay || 'prime'}`,
      char.description || '',
      char.occupation ? `dressed as a ${char.occupation}` : '',
      char.personality ? `expressing: ${char.personality.substring(0, 100)}` : '',
      'professional portrait photography, studio lighting, sharp focus',
      nsfwFilter,
    ].filter(Boolean).join('. ');

    try {
      const cost = getCreditCost('qwen-image-2.0-pro', 'text_to_image');
      const [wallet] = await db.select().from(creditWallets)
        .where(eq(creditWallets.userId, char.ownerUserId)).limit(1);
      if ((wallet?.balance ?? 0) < cost) throw new Error(`Insufficient credits: need ${cost}`);

      const result = await alibabaTextToImageWithFallback({ prompt: imagePrompt, size: '1024*1024' });

      await db.update(characters).set({
        avatarUrl: result.url,
        updatedAt: new Date(),
      }).where(eq(characters.id, characterId));

      // Deduct credits
      await db.update(creditWallets).set({
        balance: sql`GREATEST(0, ${creditWallets.balance} - ${cost})`,
        lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${cost}`,
        updatedAt: new Date(),
      }).where(eq(creditWallets.userId, char.ownerUserId));

      return { url: result.url, model: result.usedModel };
    } catch (err: any) {
      throw new BadRequestException(`Profile picture generation failed: ${err.message}`);
    }
  }

  /**
   * Upload custom profile picture for private characters.
   */
  async uploadProfilePicture(characterId: string, fileBuffer: Buffer) {
    const db = getDb();
    const [char] = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1);
    if (!char) throw new BadRequestException('Character not found');

    // In production, upload to S3/cloud storage and get URL
    // For now, accept as base64 or URL
    const base64 = fileBuffer.toString('base64');
    const url = `data:image/png;base64,${base64}`;

    await db.update(characters).set({
      avatarUrl: url,
      updatedAt: new Date(),
    }).where(eq(characters.id, characterId));

    return { url };
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

    const cost = getCreditCost('qwen-image-2.0-pro', 'text_to_image');
    const [wallet] = await db.select().from(creditWallets).where(eq(creditWallets.userId, ownerUserId)).limit(1);
    if ((wallet?.balance ?? 0) < cost) throw new BadRequestException(`Insufficient credits: need ${cost}, have ${wallet?.balance ?? 0}`);

    const result = await alibabaTextToImageWithFallback({ prompt: visualPrompt, size: '1024*1024' });

    await db.update(characters).set({
      avatarUrl: result.url,
      identityOrigin: 'public_regenerated_from_private_metadata',
      identityVersion: char.identityVersion + 1,
      status: 'ready',
      updatedAt: new Date(),
    }).where(eq(characters.id, characterId));

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
