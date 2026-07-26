# 06 — Image Generation Pipeline

## Overview

The Image Generation Pipeline produces consistent, identity-verified images of AI characters. It covers two major workflows: **Reference Pack Generation** (16 canonical images during character creation) and **On-Demand Image Generation** (selfies, story images, user-requested images).

Key principles:
- **Identity consistency**: Every image must match the canonical character DNA
- **Style variety**: Reference packs cover 16 distinct scenarios (portrait, selfie, casual, etc.)
- **Ranking & selection**: Quality scoring picks the best of multiple generations
- **Fallback chains**: Automatic model failover when providers are unavailable
- **Credit billing**: Accurate cost tracking per image

---

## 1. Reference Pack Generation

### 1.1 The 16-Image Reference Pack

A reference pack is a set of 16 images that define a character's canonical visual identity. These are the "source of truth" for all future image generation.

```typescript
// packages/ai-core/src/image/reference-pack.ts

interface ReferenceImageSpec {
  /** Unique type identifier */
  type: ReferenceImageType;
  /** Display name for UI */
  label: string;
  /** The prompt template with {name}, {gender}, etc. placeholders */
  promptTemplate: string;
  /** Negative prompt template */
  negativePromptTemplate: string;
  /** Aspect ratio */
  aspectRatio: string;        // '1:1', '4:5', '9:16'
  /** Size/dimensions */
  size: string;               // '1024x1024', '1024x1280'
  /** Priority: lower = generate first (portrait first since it defines the face) */
  priority: number;
  /** Required for identity verification */
  isVerificationImage: boolean;
}

type ReferenceImageType =
  | 'portrait'          // Professional headshot — THE canonical face
  | 'portrait_smile'    // Portrait with genuine smile
  | 'portrait_side'     // Profile from the side
  | 'portrait_full'     // Full body standing portrait
  | 'selfie'            // Mirror selfie, casual
  | 'selfie_outdoor'    // Outdoor selfie, natural light
  | 'casual_indoor'     // Casual indoor setting (reading, cooking, relaxing)
  | 'casual_outdoor'    // Outdoor casual (walking, park, street)
  | 'sitting'           // Sitting pose (cafe, couch, desk)
  | 'walking'           // Walking/motion shot
  | 'night'             // Evening/nighttime setting
  | 'formal'            // Dressed up, formal occasion
  | 'activity'          // Doing their hobby/interest
  | 'social'            // Social setting (cafe with implied friends, event)
  | 'closeup'           // Extreme closeup — eyes/expression detail
  | 'environmental';    // Wide shot showing them in their environment
```

### 1.2 Prompt Templates

```typescript
const REFERENCE_PROMPT_TEMPLATES: Record<ReferenceImageType, ReferenceImageSpec> = {
  portrait: {
    type: 'portrait',
    label: 'Portrait',
    priority: 1,
    isVerificationImage: true,
    aspectRatio: '1:1',
    size: '1024x1024',
    promptTemplate: `A photorealistic portrait of {name}, a {age} {gender} {ethnicity}. {appearance}. 
{wardrobe}. Professional headshot photography style, soft studio lighting, shallow depth of field, 
sharp focus on eyes, neutral warm-toned background, ultra-detailed skin texture, 8K quality.
CRITICAL: {facialFeatures}. {hair}. Eyes: {eyeColor}. Only ONE person in the image. 
DO NOT crop the top of the head. Full head and shoulders visible.`,
    negativePromptTemplate: `blurry, distorted face, extra limbs, multiple people, text, watermark, 
low quality, cartoon, illustration, 3D render, unrealistic, plastic skin`,
  },
  portrait_smile: {
    type: 'portrait_smile',
    label: 'Smiling Portrait',
    priority: 2,
    isVerificationImage: true,
    aspectRatio: '1:1',
    size: '1024x1024',
    promptTemplate: `A photorealistic smiling portrait of {name}. Genuine warm smile showing teeth, 
eyes crinkling naturally. {appearance}. {wardrobe}. Portrait photography, natural window lighting, 
shallow depth of field, warm tones, 8K. {facialFeatures}. ONE person only.`,
    negativePromptTemplate: `fake smile, forced expression, blurry, distorted, multiple people, 
text, watermark, low quality, cartoon`,
  },
  portrait_side: {
    type: 'portrait_side',
    label: 'Side Profile',
    priority: 3,
    isVerificationImage: true,
    aspectRatio: '1:1',
    size: '1024x1024',
    promptTemplate: `A photorealistic side profile portrait of {name}. Facing left, head turned 90 degrees.
{appearance}. {hair} visible from side. {facialFeatures} — profile view. 
{wardrobe}. Clean studio background, soft rim lighting, 8K. ONE person.`,
    negativePromptTemplate: `front facing, looking at camera, blurry, distorted, multiple people`,
  },
  portrait_full: {
    type: 'portrait_full',
    label: 'Full Body',
    priority: 4,
    isVerificationImage: true,
    aspectRatio: '3:4',
    size: '1024x1365',
    promptTemplate: `Full body portrait of {name}, standing naturally. {appearance}. {bodyType} build, 
{height} tall. Wearing {wardrobe}. {accessories}. 
Studio photography, full body visible from head to toe, clean background, soft lighting, 
fashion editorial style, 8K. {facialFeatures}. ONE person.`,
    negativePromptTemplate: `cropped, cut off, headless, blurry, multiple people, text, watermark`,
  },
  selfie: {
    type: 'selfie',
    label: 'Mirror Selfie',
    priority: 5,
    isVerificationImage: false,
    aspectRatio: '3:4',
    size: '1024x1365',
    promptTemplate: `{name} taking a mirror selfie with their phone. {selfieStyle}. 
{appearance}. {wardrobe}. Bedroom or bathroom mirror, phone visible in hand, 
natural indoor lighting, slight warm filter, candid feel, shot on smartphone, 
vertical 3:4 format. {facialFeatures}. ONE person. Casual, realistic, not staged.`,
    negativePromptTemplate: `professional photography, studio, posed, multiple people, 
perfect lighting, text overlay, watermark`,
  },
  selfie_outdoor: {
    type: 'selfie_outdoor',
    label: 'Outdoor Selfie',
    priority: 6,
    isVerificationImage: false,
    aspectRatio: '3:4',
    size: '1024x1365',
    promptTemplate: `{name} taking an outdoor selfie. {selfieStyle}. {appearance}. 
{wardrobe}. Outdoors during {lightingPreference}, park or city street background slightly blurred, 
arm extended holding phone, natural expression, candid feel, 3:4 vertical. 
{facialFeatures}. ONE person.`,
    negativePromptTemplate: `studio, indoor, professional, posed, multiple people`,
  },
  casual_indoor: {
    type: 'casual_indoor',
    label: 'Casual Indoor',
    priority: 7,
    isVerificationImage: false,
    aspectRatio: '4:5',
    size: '1024x1280',
    promptTemplate: `{name} relaxing at home. {appearance}. {wardrobe}. 
Cozy indoor setting — couch, reading nook, or kitchen. Natural pose, candid moment. 
{photographyStyle}. Warm ambient lighting, lifestyle photography, 8K. 
{facialFeatures}. ONE person.`,
    negativePromptTemplate: `studio, posed, formal, multiple people, text, watermark`,
  },
  casual_outdoor: {
    type: 'casual_outdoor',
    label: 'Casual Outdoor',
    priority: 8,
    isVerificationImage: false,
    aspectRatio: '4:5',
    size: '1024x1280',
    promptTemplate: `{name} outdoors on a casual day. {appearance}. {wardrobe}. 
Urban street or park setting, natural walking or standing pose, candid lifestyle shot. 
{photographyStyle}. {lightingPreference}. 8K. {facialFeatures}. ONE person.`,
    negativePromptTemplate: `studio, indoor, posed, formal, multiple people`,
  },
  sitting: {
    type: 'sitting',
    label: 'Sitting',
    priority: 9,
    isVerificationImage: false,
    aspectRatio: '4:5',
    size: '1024x1280',
    promptTemplate: `{name} sitting at a cafe table, looking relaxed. {appearance}. 
{wardrobe}. Cozy cafe interior, coffee cup on table, natural window light, 
candid lifestyle photography, warm tones. {facialFeatures}. ONE person.`,
    negativePromptTemplate: `standing, multiple people, text, watermark, blurry`,
  },
  walking: {
    type: 'walking',
    label: 'Walking',
    priority: 10,
    isVerificationImage: false,
    aspectRatio: '2:3',
    size: '1024x1536',
    promptTemplate: `{name} walking down a city street, mid-stride, natural motion. 
{appearance}. {wardrobe}. Urban setting, slightly blurred background (motion), 
{photographyStyle}. {lightingPreference}. 8K. {facialFeatures}. ONE person.`,
    negativePromptTemplate: `standing still, posed, studio, multiple people`,
  },
  night: {
    type: 'night',
    label: 'Nighttime',
    priority: 11,
    isVerificationImage: false,
    aspectRatio: '4:5',
    size: '1024x1280',
    promptTemplate: `{name} at night. {appearance}. {wardrobe}. 
Evening setting — city lights, warm neon glow or string lights, dim ambient lighting, 
moody atmosphere. {photographyStyle}. {facialFeatures}. ONE person.`,
    negativePromptTemplate: `daylight, bright, sunny, multiple people, text`,
  },
  formal: {
    type: 'formal',
    label: 'Formal',
    priority: 12,
    isVerificationImage: false,
    aspectRatio: '3:4',
    size: '1024x1365',
    promptTemplate: `{name} dressed up for a formal occasion. {appearance}. 
{wardrobe} but elevated — dressed up, elegant. Event setting, sophisticated atmosphere, 
editorial photography, dramatic lighting. {facialFeatures}. ONE person.`,
    negativePromptTemplate: `casual, t-shirt, jeans, multiple people, text`,
  },
  activity: {
    type: 'activity',
    label: 'Hobby/Activity',
    priority: 13,
    isVerificationImage: false,
    aspectRatio: '4:5',
    size: '1024x1280',
    promptTemplate: `{name} engaged in their passion: {interests}. {appearance}. 
{wardrobe} appropriate for the activity. Natural setting, candid action shot, 
lifestyle photography. {facialFeatures}. ONE person.`,
    negativePromptTemplate: `idle, bored, static, multiple people`,
  },
  social: {
    type: 'social',
    label: 'Social Setting',
    priority: 14,
    isVerificationImage: false,
    aspectRatio: '4:5',
    size: '1024x1280',
    promptTemplate: `{name} at a social gathering, laughing naturally. {appearance}. 
{wardrobe}. Restaurant, bar, or party atmosphere, warm lighting, candid moment, 
lifestyle photography. {facialFeatures}. This is the ONLY person in focus. 
Background may contain blurred people — that's fine.`,
    negativePromptTemplate: `alone, isolated, empty room, multiple sharp faces`,
  },
  closeup: {
    type: 'closeup',
    label: 'Close-up Detail',
    priority: 15,
    isVerificationImage: false,
    aspectRatio: '1:1',
    size: '1024x1024',
    promptTemplate: `Extreme close-up of {name}'s face — eyes and expression in sharp detail. 
{facialFeatures} very visible. {eyeColor} eyes, {hair}. 
Macro photography style, extremely shallow depth of field, crisp detail on iris, 
natural skin texture visible. {lightingPreference}. 8K.`,
    negativePromptTemplate: `full body, wide shot, multiple people, blurry`,
  },
  environmental: {
    type: 'environmental',
    label: 'Environmental',
    priority: 16,
    isVerificationImage: false,
    aspectRatio: '16:9',
    size: '1792x1024',
    promptTemplate: `Wide environmental portrait of {name} in their natural habitat. 
{appearance}. {wardrobe}. {photographyStyle}. Wide composition showing the full setting, 
cinematic framing, {lightingPreference}. {facialFeatures}. ONE person, small in frame, 
environment dominant.`,
    negativePromptTemplate: `close-up, tight crop, studio, multiple people`,
  },
};
```

### 1.3 ReferencePackGenerationService

```typescript
// apps/api/src/media/reference-pack-generation.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { 
  characters, characterReferencePacks, characterReferenceAssets, 
  generationJobs, usageEvents, creditWallets, creditLedger,
} from '@itchats/database/schema';
import { alibabaTextToImageWithFallback } from '@itchats/ai-core';
import { getCreditCost } from '@itchats/ai-core/costing';
import { eq, and, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { IdentityLockService } from '../identity/identity-lock.service';

interface CharacterDNA {
  canonicalName: string;
  physical: PhysicalDNA;
  personality: PersonalityDNA;
  visualStyle: VisualStyleDNA;
  meta: DNAMeta;
}

@Injectable()
export class ReferencePackGenerationService {
  private readonly logger = new Logger(ReferencePackGenerationService.name);
  
  constructor(
    private readonly identityLock: IdentityLockService,
  ) {}
  
  /**
   * Generate the full 16-image reference pack for a character.
   * 
   * Strategy:
   * 1. Generate portrait first (priority 1 — defines the canonical face)
   * 2. Use that seed + prompt to maintain face consistency in remaining images
   * 3. Each image goes through identity verification
   * 4. Regenerate any that fail verification (up to 3 attempts)
   * 5. Rank and select best images
   * 
   * @returns The reference pack with all generated images
   */
  async generateReferencePack(
    characterId: string,
    dna: CharacterDNA,
    ownerUserId: string,
  ): Promise<ReferencePackGenerationResult> {
    const db = getDb();
    
    // 1. Validate credits — 16 images at premium quality
    const costPerImage = getCreditCost('qwen-image-2.0-pro', 'text_to_image');
    const totalCost = costPerImage * 16;  // ~2,000 credits
    const [wallet] = await db.select().from(creditWallets)
      .where(eq(creditWallets.userId, ownerUserId)).limit(1);
    
    if ((wallet?.balance ?? 0) < totalCost) {
      throw new Error(`Insufficient credits: need ${totalCost}, have ${wallet?.balance ?? 0}`);
    }
    
    // 2. Create reference pack record
    const [pack] = await db.insert(characterReferencePacks).values({
      characterId,
      characterVersionId: dna.meta.version.toString(), // TODO: use actual version ID
      status: 'generating',
      provider: 'alibaba',
      model: 'qwen-image-2.0-pro',
      identityScore: '0',  // Updated after all generated
    }).returning();
    
    // 3. Update character status
    await db.update(characters).set({
      status: 'generating_identity',
    }).where(eq(characters.id, characterId));
    
    // 4. Build prompts from DNA
    const specs = Object.values(REFERENCE_PROMPT_TEMPLATES)
      .sort((a, b) => a.priority - b.priority);
    
    // 5. Generate images in priority order, with face consistency
    let canonicalSeed: bigint | null = null;
    const generatedImages: GeneratedReferenceImage[] = [];
    let totalCreditCost = 0;
    
    for (const spec of specs) {
      const prompt = this.fillPromptTemplate(spec.promptTemplate, dna);
      const negativePrompt = this.fillPromptTemplate(spec.negativePromptTemplate, dna);
      
      // First image (portrait) sets the canonical seed
      const isPriority1 = spec.priority === 1;
      let result: GeneratedReferenceImage | null = null;
      let attempts = 0;
      const maxAttempts = isPriority1 ? 5 : 3;  // More retries for the canonical face
      
      while (!result && attempts < maxAttempts) {
        attempts++;
        
        // Add seed-based consistency after first successful image
        const finalPrompt = canonicalSeed && !isPriority1
          ? `${prompt}. IMPORTANT: Same person as in previous images with seed ${canonicalSeed}. 
Consistent facial structure, same {name}. Use seed ${canonicalSeed + BigInt(attempts)}.`
          : prompt;
        
        try {
          const imageResult = await alibabaTextToImageWithFallback({
            prompt: finalPrompt,
            size: spec.size,
          });
          
          // Verify identity consistency (if we have canonical seed)
          let identityScore = 1.0;
          if (canonicalSeed && !isPriority1) {
            const verification = await this.identityLock.verifyAgainstCanonical(
              characterId,
              await this.extractEmbedding(imageResult.url),
            );
            identityScore = verification.score;
            
            // Stricter threshold for verification images
            const threshold = spec.isVerificationImage ? 0.85 : 0.78;
            if (!verification.passed) {
              this.logger.warn(
                `Reference image ${spec.type} attempt ${attempts}: identity score ${identityScore.toFixed(3)} < ${threshold}`
              );
              continue;  // Retry
            }
          }
          
          // Store reference image
          const [asset] = await db.insert(characterReferenceAssets).values({
            characterId,
            characterVersionId: pack.characterVersionId,
            mediaAssetId: randomUUID(),  // TODO: upload to media storage
            referenceType: spec.type,
            sortOrder: spec.priority,
            generationJobId: randomUUID(),
            approved: identityScore >= 0.85,  // Auto-approve if high enough
            qualityScore: String(identityScore),
            prompt: finalPrompt,
            negativePrompt,
            seed: canonicalSeed ? Number(canonicalSeed) + attempts : undefined,
            identityScore: String(identityScore),
          }).returning();
          
          // Record the canonical seed from the first successful image
          if (isPriority1 && !canonicalSeed) {
            canonicalSeed = BigInt(Date.now());  // Use timestamp as proxy for seed
          }
          
          result = {
            id: asset!.id,
            type: spec.type,
            url: imageResult.url,
            identityScore,
            approved: identityScore >= 0.85,
            attempts,
            prompt: finalPrompt,
          };
          
          generatedImages.push(result);
          
          // Debit credits
          totalCreditCost += costPerImage;
          
        } catch (err: any) {
          this.logger.error(`Reference image ${spec.type} attempt ${attempts} failed: ${err.message}`);
          if (attempts >= maxAttempts) {
            // After max attempts, store as failed/rejected
            generatedImages.push({
              id: randomUUID(),
              type: spec.type,
              url: '',
              identityScore: 0,
              approved: false,
              attempts,
              prompt: '',
              error: err.message,
            });
          }
        }
      }
    }
    
    // 6. Compute aggregate identity score
    const successfulScores = generatedImages
      .filter(img => img.approved)
      .map(img => img.identityScore);
    
    const avgScore = successfulScores.length > 0
      ? successfulScores.reduce((a, b) => a + b, 0) / successfulScores.length
      : 0;
    
    // 7. Update reference pack
    const approvedCount = generatedImages.filter(img => img.approved).length;
    const packStatus = approvedCount >= 12 ? 'ready' : 'generating';
    
    await db.update(characterReferencePacks).set({
      status: packStatus,
      identityScore: String(Math.round(avgScore * 10000) / 10000),
      canonicalSeed: canonicalSeed ? Number(canonicalSeed) : undefined,
      generatedAt: new Date(),
    }).where(eq(characterReferencePacks.id, pack!.id));
    
    // 8. Debit total credits
    await db.update(creditWallets).set({
      balance: sql`GREATEST(0, ${creditWallets.balance} - ${totalCreditCost})`,
      lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${totalCreditCost}`,
      updatedAt: new Date(),
    }).where(eq(creditWallets.userId, ownerUserId));
    
    // 9. Update character status
    await db.update(characters).set({
      status: approvedCount >= 12 ? 'ready' : 'generating_identity',
      referencePackId: pack!.id,
    }).where(eq(characters.id, characterId));
    
    return {
      packId: pack!.id,
      status: packStatus,
      totalImages: 16,
      approvedImages: approvedCount,
      rejectedImages: generatedImages.filter(img => !img.approved).length,
      identityScore: avgScore,
      images: generatedImages,
      totalCreditsUsed: totalCreditCost,
    };
  }
  
  /**
   * Regenerate a SINGLE reference image that failed identity verification.
   */
  async regenerateReferenceImage(
    characterId: string,
    referenceImageId: string,
    dna: CharacterDNA,
    ownerUserId: string,
    rejectionReason: string,  // From identity verification failure
  ): Promise<GeneratedReferenceImage> {
    const db = getDb();
    
    const [existing] = await db.select().from(characterReferenceAssets)
      .where(eq(characterReferenceAssets.id, referenceImageId))
      .limit(1);
    
    if (!existing) throw new Error('Reference image not found');
    
    const spec = REFERENCE_PROMPT_TEMPLATES[existing.referenceType as ReferenceImageType];
    if (!spec) throw new Error('Unknown reference type');
    
    // Modify negative prompt to specifically address the rejection reason
    const enhancedNegativePrompt = `${spec.negativePromptTemplate}. 
IDENTITY FIX: ${rejectionReason}. The face MUST match the canonical identity.`;
    
    const prompt = this.fillPromptTemplate(spec.promptTemplate, dna);
    
    const result = await alibabaTextToImageWithFallback({
      prompt: `${prompt}. IMPORTANT: Same person as canonical reference images. Consistent identity.`,
      size: spec.size,
    });
    
    // Verify against canonical
    const verification = await this.identityLock.verifyAgainstCanonical(
      characterId,
      await this.extractEmbedding(result.url),
    );
    
    const costPerImage = getCreditCost('qwen-image-2.0-pro', 'text_to_image');
    
    // Update the asset record
    await db.update(characterReferenceAssets).set({
      mediaAssetId: randomUUID(),
      approved: verification.passed,
      qualityScore: String(verification.score),
      prompt,
      negativePrompt: enhancedNegativePrompt,
      identityScore: String(verification.score),
    }).where(eq(characterReferenceAssets.id, referenceImageId));
    
    return {
      id: referenceImageId,
      type: existing.referenceType,
      url: result.url,
      identityScore: verification.score,
      approved: verification.passed,
      attempts: 1,
      prompt,
    };
  }
  
  /**
   * Fill a prompt template with character DNA values.
   */
  private fillPromptTemplate(template: string, dna: CharacterDNA): string {
    const ph = dna.physical;
    const vs = dna.visualStyle;
    const p = dna.personality;
    
    return template
      .replace(/\{name\}/g, dna.canonicalName)
      .replace(/\{age\}/g, ph.ageDisplay)
      .replace(/\{gender\}/g, ph.gender)
      .replace(/\{ethnicity\}/g, ph.ethnicity)
      .replace(/\{appearance\}/g, [
        `${ph.gender} in ${ph.ageDisplay}`,
        `${ph.bodyType} build`,
        `${ph.skinTone} skin`,
      ].join(', '))
      .replace(/\{wardrobe\}/g, ph.wardrobe)
      .replace(/\{facialFeatures\}/g, ph.facialFeatures)
      .replace(/\{hair\}/g, ph.hair)
      .replace(/\{eyeColor\}/g, ph.eyeColor)
      .replace(/\{height\}/g, ph.height)
      .replace(/\{bodyType\}/g, ph.bodyType)
      .replace(/\{accessories\}/g, ph.accessories || '')
      .replace(/\{tattoos\}/g, ph.tattoos || '')
      .replace(/\{selfieStyle\}/g, vs.selfieStyle)
      .replace(/\{photographyStyle\}/g, vs.photographyStyle)
      .replace(/\{lightingPreference\}/g, vs.lightingPreference)
      .replace(/\{interests\}/g, (p as any).interests?.[0] || p.humorStyle);
  }
  
  private async extractEmbedding(imageUrl: string): Promise<number[]> {
    // Use text description as embedding proxy (see Character Identity Engine doc)
    const { alibabaChat, alibabaEmbedText } = await import('@itchats/ai-core');
    const desc = await alibabaChat({
      messages: [{ role: 'user', content: `Describe ONLY the face in this image in extreme detail: ${imageUrl}` }],
      model: 'qwen3.5-flash', maxTokens: 200, temperature: 0.1,
    });
    const embeddings = await alibabaEmbedText({ input: [desc.content], model: 'text-embedding-v4' });
    return embeddings[0];
  }
}

interface GeneratedReferenceImage {
  id: string;
  type: string;
  url: string;
  identityScore: number;
  approved: boolean;
  attempts: number;
  prompt: string;
  error?: string;
}

interface ReferencePackGenerationResult {
  packId: string;
  status: string;
  totalImages: number;
  approvedImages: number;
  rejectedImages: number;
  identityScore: number;
  images: GeneratedReferenceImage[];
  totalCreditsUsed: number;
}
```

---

## 2. On-Demand Image Generation

### 2.1 Image Types

```typescript
type OnDemandImageType =
  | 'selfie'           // Character sends a selfie (user request or auto)
  | 'story_image'      // Image for a story post
  | 'contextual'       // "Show me your outfit today"
  | 'avatar_update'    // Update character profile picture
  | 'user_request';    // User requested a specific image of the character
```

### 2.2 OnDemandImageService

```typescript
// apps/api/src/media/on-demand-image.service.ts

@Injectable()
export class OnDemandImageService {
  /**
   * Generate an on-demand character image.
   * 
   * Flow:
   * 1. Build identity-consistent prompt from DNA + context
   * 2. Generate with fallback chain
   * 3. Verify against canonical identity (if locked)
   * 4. Regenerate if verification fails
   * 5. Return best image
   */
  async generateCharacterImage(
    characterId: string,
    userId: string,
    type: OnDemandImageType,
    context?: string,  // e.g., "at a concert", "feeling happy today"
  ): Promise<GeneratedImage> {
    const db = getDb();
    
    // 1. Load character + DNA
    const [char] = await db.select().from(characters)
      .where(eq(characters.id, characterId)).limit(1);
    if (!char) throw new Error('Character not found');
    
    const dna = await this.getCharacterDNA(characterId);
    if (!dna && char.identityLock) {
      throw new Error('Locked character has no DNA — this is a bug');
    }
    
    // 2. Build prompt
    const prompt = dna
      ? this.buildIdentityConsistentPrompt(dna, type, context)
      : this.buildBasicPrompt(char, type, context);
    
    // 3. Determine model based on image type
    const model = type === 'avatar_update' || type === 'selfie'
      ? 'qwen-image-2.0-pro'     // Premium for important images
      : 'qwen-image-2.0';        // Standard for casual images
    
    const cost = getCreditCost(model, 'text_to_image');
    
    // 4. Check credits
    const [wallet] = await db.select().from(creditWallets)
      .where(eq(creditWallets.userId, userId)).limit(1);
    if ((wallet?.balance ?? 0) < cost) {
      throw new Error(`Insufficient credits: need ${cost}, have ${wallet?.balance ?? 0}`);
    }
    
    // 5. Generate with retry logic
    let bestResult: { url: string; model: string; identityScore?: number } | null = null;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      const generationPrompt = attempt > 0
        ? `${prompt}. CRITICAL: The person must look IDENTICAL to ${dna?.canonicalName || char.name}. Same face, same features, same build.`
        : prompt;
      
      const result = await alibabaTextToImageWithFallback({
        prompt: generationPrompt,
        size: type === 'story_image' ? '1024x1280' : '1024x1024',
      });
      
      // Identity verification for locked characters
      if (dna && char.identityLock) {
        const embedding = await this.extractEmbedding(result.url);
        const verification = await this.identityLockService.verifyAgainstCanonical(
          characterId, embedding,
        );
        
        if (verification.passed) {
          bestResult = { ...result, identityScore: verification.score };
          break;
        }
        
        // Track best attempt even if failed
        if (!bestResult || (verification.score > (bestResult.identityScore ?? 0))) {
          bestResult = { ...result, identityScore: verification.score };
        }
      } else {
        bestResult = result;
        break;
      }
    }
    
    if (!bestResult || !bestResult.url) {
      throw new Error('Image generation failed after all attempts');
    }
    
    // 6. Record generation + debit credits
    await this.recordGeneration(userId, characterId, type, bestResult, cost, prompt);
    
    // 7. Update relationship stats
    await db.update(characterRelationships).set({
      imageRequests: sql`COALESCE(${characterRelationships.imageRequests}, 0) + 1`,
    }).where(and(
      eq(characterRelationships.characterId, characterId),
      eq(characterRelationships.userId, userId),
    ));
    
    return {
      url: bestResult.url,
      model: bestResult.model,
      type,
      identityScore: bestResult.identityScore,
      creditsUsed: cost,
    };
  }
  
  /**
   * Build a prompt that maintains identity consistency using DNA.
   */
  private buildIdentityConsistentPrompt(
    dna: CharacterDNA,
    type: OnDemandImageType,
    context?: string,
  ): string {
    const ph = dna.physical;
    const vs = dna.visualStyle;
    
    const identityBlock = [
      `${dna.canonicalName}, a ${ph.gender} in ${ph.ageDisplay}`,
      `${ph.bodyType} build, ${ph.height}`,
      `${ph.skinTone} skin, ${ph.eyeColor} eyes`,
      `${ph.hair}`,
      `${ph.facialFeatures}`,
      ph.tattoos ? `Tattoos: ${ph.tattoos}` : '',
      ph.accessories ? `Wearing: ${ph.accessories}` : '',
    ].filter(Boolean).join('. ');
    
    const typePrompts: Record<OnDemandImageType, string> = {
      selfie: `${identityBlock}. Selfie photo, ${vs.selfieStyle}. ${vs.photographyStyle}. ${context || 'casual moment'}. Smartphone camera quality, natural expression. ONE person.`,
      story_image: `${identityBlock}. ${vs.photographyStyle}. ${context || 'aesthetic lifestyle shot'}. Vertical 4:5 format, ${vs.lightingPreference}. Social media story style. ONE person.`,
      contextual: `${identityBlock}. ${context || 'in their natural environment'}. ${vs.photographyStyle}. Candid lifestyle shot. ONE person.`,
      avatar_update: `${identityBlock}. Professional portrait, ${vs.photographyStyle}. Clean background, sharp focus, 1:1 square format. ONE person.`,
      user_request: `${identityBlock}. ${context || 'photorealistic portrait'}. ${vs.photographyStyle}. ONE person.`,
    };
    
    return typePrompts[type];
  }
  
  private buildBasicPrompt(char: any, type: OnDemandImageType, context?: string): string {
    return [
      `${char.name}, ${char.gender || 'person'} in ${char.ageDisplay || 'their prime'}`,
      char.description,
      context,
      type === 'selfie' ? 'selfie style, casual, natural lighting' : 'photorealistic portrait',
      'ONE person only',
    ].filter(Boolean).join(', ');
  }
}
```

---

## 3. Fallback Chain

### 3.1 Model Fallback Order

The system already implements comprehensive fallback chains in `alibabaTextToImageWithFallback`:

```typescript
// Phase 1: Compatible-mode (OpenAI format) — works with all key types
const COMPAT_MODELS = [
  'qwen-image-2.0-pro',        // Best quality
  'qwen-image-2.0-pro-2026-06-22',
  'qwen-image-2.0-pro-2026-04-22',
  'qwen-image-max',            // High quality alternative
  'qwen-image-plus',           // Good quality / speed balance
  'qwen-image-2.0',            // Standard quality
  'wan2.7-image-pro',          // Wanx series
  'wan2.7-image',
  'z-image-turbo',             // Speed optimized
];

// Phase 2: Native DashScope (only for non-workspace keys)
const NATIVE_MODELS = [
  'qwen-image-2.0-pro',
  'qwen-image-max',
  'qwen-image-plus',
  'qwen-image-2.0',
];
```

### 3.2 Provider-Level Fallback (Phase 2)

When Alibaba is unavailable, fall back to alternative providers:

```typescript
const PROVIDER_FALLBACKS: Record<string, string[]> = {
  'alibaba': ['openai', 'stability', 'replicate'],
  'openai': ['alibaba', 'stability'],
};

async function generateWithProviderFallback(
  prompt: string,
  preferredProvider: string,
): Promise<ImageResult> {
  const providers = [preferredProvider, ...(PROVIDER_FALLBACKS[preferredProvider] || [])];
  
  for (const provider of providers) {
    try {
      switch (provider) {
        case 'alibaba': return await alibabaTextToImageWithFallback({ prompt });
        case 'openai': return await openaiTextToImage({ prompt });
        case 'stability': return await stabilityTextToImage({ prompt });
      }
    } catch (err) {
      continue;  // Next provider
    }
  }
  
  throw new Error('All image providers exhausted');
}
```

---

## 4. Quality Ranking

### 4.1 ImageRankingService

For reference pack images that pass identity verification, rank by aesthetic quality:

```typescript
@Injectable()
export class ImageRankingService {
  /**
   * Rank generated images by composite quality score.
   * Used to select the best image from multiple generations of the same reference type.
   */
  async rankImages(
    images: { url: string; identityScore: number }[],
  ): Promise<RankedImage[]> {
    return images.map(img => ({
      url: img.url,
      identityScore: img.identityScore,
      qualityScore: img.identityScore,  // For now, identity = quality
      // Future: add aesthetic scoring via another model
    })).sort((a, b) => b.qualityScore - a.qualityScore);
  }
}
```

---

## 5. Credit Costs

| Image Type | Model | Credits per Image |
|-----------|-------|-------------------|
| Reference Pack (per image) | qwen-image-2.0-pro | 125 |
| Full Reference Pack (16 images) | qwen-image-2.0-pro | 2,000 |
| Selfie / Avatar | qwen-image-2.0-pro | 125 |
| Story Image | qwen-image-2.0 | 62 |
| Casual / Contextual | qwen-image-2.0 | 62 |
| Image-to-Image Edit | qwen-image-edit-plus | 50 |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/characters/:id/reference-pack/generate` | Start reference pack generation |
| `GET` | `/characters/:id/reference-pack` | Get reference pack status + images |
| `POST` | `/characters/:id/reference-images/:imageId/regenerate` | Regenerate a single reference image |
| `PATCH` | `/characters/:id/reference-images/:imageId/approve` | Approve/reject a reference image |
| `POST` | `/characters/:id/images/selfie` | Generate character selfie |
| `POST` | `/characters/:id/images/generate` | Generate contextual character image |
| `GET` | `/images/generation-status/:jobId` | Poll generation job status |
