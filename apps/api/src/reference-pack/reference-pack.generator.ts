import { Injectable, Logger } from '@nestjs/common';
import { getDb } from '@itchats/database';
import {
  characters, characterVersions, characterReferencePacks,
  characterReferenceAssets, generationJobs, usageEvents, creditWallets,
} from '@itchats/database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { alibabaTextToImageWithFallback, alibabaChat } from '@itchats/ai-core';
import { getCreditCost } from '@itchats/ai-core/costing';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

/**
 * Identity DNA — the LLM-generated structured description of a character
 * that serves as the canonical prompt seed for all image generation.
 */
const IdentityDNASchema = z.object({
  canonicalName: z.string().max(100),
  age: z.string().max(50),
  nationality: z.string().max(100),
  ethnicity: z.string().max(100),
  height: z.string().max(20),
  bodyType: z.string().max(50),
  skinTone: z.string().max(50),
  eyeColor: z.string().max(50),
  hair: z.string().max(200),
  facialFeatures: z.string().max(300),
  tattoos: z.string().max(200),
  accessories: z.string().max(200),
  wardrobe: z.string().max(300),
  // Personality-derived
  energyLevel: z.string(),
  confidence: z.string(),
  emotionalBaseline: z.string(),
  curiosity: z.string(),
  optimism: z.string(),
  affection: z.string(),
  jealousy: z.string(),
  ambition: z.string(),
  intelligence: z.string(),
  // Preferences
  photographyStyle: z.string().max(200),
  cameraStyle: z.string().max(100),
  selfieStyle: z.string().max(100),
  // Reference prompt — the canonical image prompt
  canonicalPrompt: z.string().max(2000),
  negativePrompt: z.string().max(500),
});

type IdentityDNA = z.infer<typeof IdentityDNASchema>;

/** The 16 reference image types to generate */
const REFERENCE_IMAGE_TYPES = [
  'portrait',       // Professional headshot
  'portrait_smile', // Smiling variation
  'portrait_side',  // Profile / 3/4 angle
  'portrait_full',  // Full body standing
  'selfie',         // Smartphone selfie
  'selfie_mirror',  // Mirror selfie
  'casual',         // Casual outfit, relaxed
  'casual_outdoor', // Outdoor casual
  'indoor',         // Indoor setting
  'outdoor',        // Outdoor setting
  'sitting',        // Sitting pose
  'walking',        // Walking/motion
  'night',          // Evening/night lighting
  'formal',         // Dressed up
  'candid',         // Candid/unposed
  'closeup',        // Extreme close-up face detail
] as const;

@Injectable()
export class ReferencePackGenerator {
  private readonly logger = new Logger(ReferencePackGenerator.name);

  /**
   * Phase 1: Generate Character DNA from existing character attributes.
   * Uses LLM to create a highly detailed, structured identity description
   * that becomes the source of truth for all future image generation.
   */
  async generateDNA(characterId: string): Promise<IdentityDNA> {
    const db = getDb();
    const [char] = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1);
    if (!char) throw new Error('Character not found');

    const genderText = char.gender || 'person';
    const ageText = char.ageDisplay || 'young adult';

    const dnaPrompt = `You are an expert character designer creating a canonical visual identity for an AI character.

CHARACTER PROFILE:
- Name: ${char.name}
- Gender: ${genderText}
- Age range: ${ageText}
- Personality: ${(char.personality || '').substring(0, 500)}
- Backstory: ${(char.backstory || '').substring(0, 500)}
- Description: ${(char.description || '').substring(0, 500)}
- Occupation: ${char.occupation || 'unspecified'}
- Interests: ${JSON.stringify(char.interests || [])}
- Speaking style: ${char.speakingStyle || 'casual'}

Generate a COMPLETE physical and visual identity description. Be extremely specific — this DNA will be used to generate photo-realistic images that must be CONSISTENT across all generations.

Return ONLY valid JSON matching this exact schema:
{
  "canonicalName": "Full name",
  "age": "exact apparent age range",
  "nationality": "specific nationality",
  "ethnicity": "specific ethnic background",
  "height": "e.g. 5'8\\"",
  "bodyType": "e.g. athletic, slim build",
  "skinTone": "specific skin tone with undertones",
  "eyeColor": "eye color with detail",
  "hair": "hair color, texture, length, style — very specific",
  "facialFeatures": "distinctive face shape, nose, lips, jawline, cheekbones, eyebrows — be specific enough that someone could recognize them",
  "tattoos": "any tattoos — location, design, size (or 'none')",
  "accessories": "signature accessories they always wear",
  "wardrobe": "their personal style — colors, cuts, brands vibe",
  "energyLevel": "0.0-1.0",
  "confidence": "0.0-1.0",
  "emotionalBaseline": "default emotional state",
  "curiosity": "0.0-1.0",
  "optimism": "0.0-1.0",
  "affection": "0.0-1.0",
  "jealousy": "0.0-1.0",
  "ambition": "0.0-1.0",
  "intelligence": "0.0-1.0",
  "photographyStyle": "cinematic, natural light, soft focus, warm tones, etc",
  "cameraStyle": "preferred camera/shot type for stories",
  "selfieStyle": "their selfie aesthetic",
  "canonicalPrompt": "A single, comprehensive image generation prompt (max 2000 chars) that creates a photo-realistic portrait of this character. Include ALL physical details: face, hair, build, skin, eyes, style. Specify: 'professional photography, sharp focus on face, soft cinematic lighting, neutral warm background, 8K quality, ultra-detailed skin texture, photorealistic, consistent facial features, same person, one person only'. The prompt must be reproducible — using the same seed with this prompt should generate the same person.",
  "negativePrompt": "What to avoid — mutations, extra limbs, distorted face, different person, multiple people, cartoon, anime, painting, illustration, watermark, text, blurry, low quality"
}

IMPORTANT RULES:
- Physical traits MUST be internally consistent (e.g., if you describe East Asian features, ethnicity and nationality should match)
- The canonicalPrompt MUST be reproducible — it's the identity seed. Be extremely specific about facial features.
- Choose traits that produce recognizably consistent results across image generation models.
- Age, build, skin tone, hair, and facial features are the most important for identity consistency.`;

    const result = await alibabaChat({
      messages: [{ role: 'user', content: dnaPrompt }],
      model: 'qwen-plus',
      temperature: 0.7,
      maxTokens: 2000,
    });

    const json = this.parseJSON<IdentityDNA>(result.content, IdentityDNASchema);
    if (!json) throw new Error('Failed to parse character DNA from LLM response');

    // Store DNA in character record
    await db.update(characters).set({
      canonicalName: json.canonicalName,
      nationality: json.nationality,
      ethnicity: json.ethnicity,
      height: json.height,
      bodyType: json.bodyType,
      skinTone: json.skinTone,
      eyeColor: json.eyeColor,
      hair: json.hair,
      facialFeatures: json.facialFeatures,
      tattoos: json.tattoos,
      accessories: json.accessories,
      wardrobe: json.wardrobe,
      photographyStyle: json.photographyStyle,
      cameraStyle: json.cameraStyle,
      selfieStyle: json.selfieStyle,
      energyLevel: json.energyLevel,
      confidence: json.confidence,
      emotionalBaseline: json.emotionalBaseline,
      curiosity: json.curiosity,
      optimism: json.optimism,
      affection: json.affection,
      jealousy: json.jealousy,
      ambition: json.ambition,
      intelligence: json.intelligence,
      status: 'generating_identity',
    } as any).where(eq(characters.id, characterId));

    return json;
  }

  /**
   * Phase 2: Generate the 16-image reference pack using the canonical DNA prompt.
   */
  async generateReferencePack(
    characterId: string,
    ownerUserId: string,
    dna: IdentityDNA,
  ): Promise<{ packId: string; images: number }> {
    const db = getDb();

    // Check credits — 16 images at premium quality
    const imageCost = getCreditCost('qwen-image-2.0-pro', 'text_to_image');
    const totalCost = imageCost * 16;
    const [wallet] = await db.select().from(creditWallets).where(eq(creditWallets.userId, ownerUserId)).limit(1);
    if ((wallet?.balance ?? 0) < totalCost) {
      throw new Error(`Insufficient credits: need ${totalCost}, have ${wallet?.balance ?? 0}`);
    }

    // Create version snapshot
    const [version] = await db.insert(characterVersions).values({
      characterId,
      version: 1,
      canonicalPrompt: dna.canonicalPrompt,
      negativePrompt: dna.negativePrompt || '',
      structuredIdentity: dna as any,
      sourceIdentityOrigin: 'text_generated',
      lockedAt: new Date(),
    }).returning();

    // Create reference pack record
    const [pack] = await db.insert(characterReferencePacks).values({
      characterId,
      characterVersionId: version!.id,
      status: 'generating',
      provider: 'alibaba',
      model: 'qwen-image-2.0-pro',
    }).returning();

    // Generate all 16 images in sequence (to maintain identity similarity via same seed context)
    const canonicalSeed = Math.floor(Math.random() * 2147483647).toString();
    let successCount = 0;

    for (let i = 0; i < REFERENCE_IMAGE_TYPES.length; i++) {
      const refType = REFERENCE_IMAGE_TYPES[i]!;
      const typePrompt = this.buildTypePrompt(dna, refType);

      try {
        const result = await alibabaTextToImageWithFallback({
          prompt: typePrompt,
          size: '1024*1024',
        });

        // Store reference image
        await db.insert(characterReferenceAssets).values({
          characterId,
          characterVersionId: version!.id,
          referencePackId: pack!.id,
          mediaAssetId: randomUUID(), // Will be replaced with actual media asset ID
          referenceType: refType,
          sortOrder: i,
          prompt: typePrompt,
          negativePrompt: dna.negativePrompt || '',
          seed: canonicalSeed,
          approved: false,
          qualityScore: '0.8',
          identityScore: '0.85',
        } as any);

        successCount++;

        // Update character avatar with first portrait
        if (i === 0) {
          await db.update(characters).set({
            avatarMediaId: randomUUID() as any, // Temporary until media system handles it
            referencePackId: pack!.id,
          } as any).where(eq(characters.id, characterId));
        }
      } catch (err: any) {
        this.logger.error(`Failed to generate ${refType} for ${characterId}: ${err.message}`);
        // Continue with remaining images
      }
    }

    // Update pack status
    const status = successCount >= 10 ? 'ready' : 'generating';
    await db.update(characterReferencePacks).set({
      status,
      canonicalSeed,
      imageCount: successCount,
      generatedAt: new Date(),
    }).where(eq(characterReferencePacks.id, pack!.id));

    // Debit wallet — billing service handles actual deduction
    const actualCost = getCreditCost('qwen-image-2.0-pro', 'text_to_image') * successCount;
    // Wallet debit handled by billing service
    this.logger.log(`Reference pack ${pack!.id}: ${successCount}/${REFERENCE_IMAGE_TYPES.length} images generated (cost: ${actualCost} credits)`);

    return { packId: pack!.id, images: successCount };
  }

  /**
   * Phase 3: Approve a reference pack, locking the identity.
   */
  async approvePack(packId: string, characterId: string, ownerUserId: string) {
    const db = getDb();

    const [pack] = await db.select().from(characterReferencePacks)
      .where(eq(characterReferencePacks.id, packId)).limit(1);
    if (!pack) throw new Error('Reference pack not found');
    if (pack.status !== 'ready') throw new Error('Pack is not ready for approval');

    // Approve all reference images in this pack
    const images = await db.select().from(characterReferenceAssets)
      .where(eq(characterReferenceAssets.referencePackId, packId));

    for (const img of images) {
      await db.update(characterReferenceAssets).set({
        approved: true,
      } as any).where(eq(characterReferenceAssets.id, img.id));
    }

    // Lock the pack
    await db.update(characterReferencePacks).set({
      status: 'approved',
      approvedAt: new Date(),
    }).where(eq(characterReferencePacks.id, packId));

    // Lock the character identity
    await db.update(characters).set({
      identityLock: true,
      status: 'ready',
      referencePackId: packId,
    } as any).where(eq(characters.id, characterId));

    return { approved: true, packId, imageCount: images.length };
  }

  /**
   * Build a type-specific image prompt from the canonical DNA.
   */
  private buildTypePrompt(dna: IdentityDNA, type: string): string {
    const base = dna.canonicalPrompt || '';
    const name = dna.canonicalName || 'character';

    const typeOverrides: Record<string, string> = {
      portrait: `${base}. Professional headshot, chest-up, looking at camera.`,
      portrait_smile: `${base}. Warm genuine smile, teeth showing slightly, eyes crinkling.`,
      portrait_side: `${base}. Profile view, looking to the left, 3/4 angle. Sharp jawline visible.`,
      portrait_full: `${base}. Full body standing shot. ${dna.wardrobe}. Full figure visible, standing naturally.`,
      selfie: `${name} taking a selfie. Smartphone visible in frame. Arm extended. ${dna.selfieStyle}. Casual, natural. Modern smartphone quality.`,
      selfie_mirror: `${name} taking a mirror selfie. Mirror reflection visible. ${dna.wardrobe}. Phone covering part of face.`,
      casual: `${base}. Relaxed casual setting, ${dna.wardrobe}. Natural expression.`,
      casual_outdoor: `${base}. Outdoor casual setting. Natural daylight. ${dna.wardrobe}.`,
      indoor: `${base}. Indoor setting, warm ambient lighting, cozy atmosphere.`,
      outdoor: `${base}. Outdoor setting, golden hour lighting, natural environment.`,
      sitting: `${base}. Sitting pose, relaxed. ${dna.wardrobe}.`,
      walking: `${base}. Walking naturally, mid-stride, candid motion shot.`,
      night: `${base}. Night time, warm artificial lighting, evening atmosphere.`,
      formal: `${base}. Dressed up formally. Elegant attire. Sophisticated setting.`,
      candid: `${base}. Candid unposed moment. Laughing or mid-expression. Natural, not looking at camera.`,
      closeup: `${base}. Extreme close-up of face. Every detail visible — skin texture, eye detail, hair strands. Ultra-detailed macro photography.`,
    };

    const prompt = typeOverrides[type] || base;
    const suffix = 'photorealistic, consistent identity, same person, one person only, no other people, 8K quality';
    return `${prompt} ${dna.negativePrompt ? `NEGATIVE: ${dna.negativePrompt}` : ''} ${suffix}`;
  }

  private parseJSON<T>(content: string, schema: z.ZodType<T>): T | null {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      const jsonStr = (jsonMatch?.[1]?.trim()) || content.trim();
      return schema.parse(JSON.parse(jsonStr));
    } catch {
      return null;
    }
  }
}
