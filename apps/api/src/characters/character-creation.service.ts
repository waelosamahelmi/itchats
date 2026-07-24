import { Injectable, BadRequestException } from '@nestjs/common';
import { getDb } from '@itchats/database';
import {
  characters, characterVersions, characterVoiceProfiles, characterLocations,
  characterReferenceAssets, mediaAssets, creditWallets,
} from '@itchats/database/schema';
import { eq, and } from 'drizzle-orm';
import { CreateCharacterSchema, type CreateCharacterInput } from '@itchats/contracts';
import { getCreditCost } from '@itchats/ai-core/costing';
import { alibabaChat } from '@itchats/ai-core';
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

    // Save location
    if (parsed.city || parsed.countryCode) {
      await db.insert(characterLocations).values({
        characterId: character!.id,
        city: parsed.city,
        countryCode: parsed.countryCode,
        timezone: parsed.timezone,
        source: 'declared',
      });
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
