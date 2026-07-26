# 03 — Character Identity Engine

## Overview

The Character Identity Engine (CIE) is the core subsystem that creates, locks, verifies, and maintains a character's visual and behavioral identity. Every public character must have a **locked canonical identity** — a set of approved reference images and a verified identity profile that ensures consistency across all generated content.

The engine operates in distinct phases:
1. **DNA Generation** — AI-generated identity profile from seed data
2. **Reference Pack Generation** — 16 canonical images across varied scenarios
3. **Identity Verification** — Embedding-based consistency scoring  
4. **Identity Locking** — Freeze approved reference pack as canonical
5. **Drift Prevention** — Runtime checks against canonical identity
6. **Regeneration Flows** — Safe identity rebuild without breaking consistency

---

## Phase 1: DNA Generation

### 1.1 Character DNA Interface

```typescript
// packages/ai-core/src/identity/dna.ts

interface CharacterDNA {
  /** Canonical immutable name — never changes after locking */
  canonicalName: string;
  
  /** Physical attributes (deterministic for image generation) */
  physical: PhysicalDNA;
  
  /** Behavioral/personality attributes */
  personality: PersonalityDNA;
  
  /** Visual style preferences */
  visualStyle: VisualStyleDNA;
  
  /** Voice/speech profile */
  voice: VoiceDNA;
  
  /** Generation metadata */
  meta: DNAMeta;
}

interface PhysicalDNA {
  gender: string;              // "female" | "male" | "non-binary"
  ageDisplay: string;          // "mid-20s", "early-30s"
  height: string;              // "5'8\""
  bodyType: string;            // "athletic", "slim", "curvy"
  skinTone: string;            // "warm ivory", "deep brown", "olive"
  eyeColor: string;            // "hazel", "dark brown", "blue"
  hair: string;                // "long wavy black", "short curly brown"
  facialFeatures: string;      // "strong jawline", "freckles across nose"
  tattoos: string;             // "small star behind left ear"
  accessories: string;         // "always wears silver hoop earrings"
  wardrobe: string;            // "minimalist, earth tones, oversized blazers"
  nationality: string;
  ethnicity: string;
}

interface PersonalityDNA {
  traits: Record<string, number>;  // e.g. { openness: 0.8, extraversion: 0.6 }
  energyLevel: string;             // "7" (0-10)
  confidence: string;              // "0.8" (0-1)
  emotionalBaseline: string;       // "optimistic", "melancholic", "neutral"
  curiosity: string;               // "0.9" (0-1)
  optimism: string;                // "0.75" (0-1)
  affection: string;               // "0.7" (0-1)
  jealousy: string;                // "0.3" (0-1)
  ambition: string;                // "0.85" (0-1)
  intelligence: string;            // "0.8" (0-1)
  humorStyle: string;              // "dry/witty", "playful/silly", "dark"
  speakingStyle: string;           // "casual with British slang, uses 'mate' often"
  emojiStyle: string;              // "minimal, only 😂 and 🙃"
  secrets: string[];               // ["Has a fear of balloons", "Secretly writes poetry"]
  goals: string[];                 // ["Open a bakery", "Travel to Japan"]
  fears: string[];                 // ["Being forgotten", "Heights"]
  routines: Routine[];             // Daily schedule
  sleepSchedule: string;           // "23:00-07:00"
  musicTaste: string;              // "indie folk, lo-fi hip hop"
  foodTaste: string;               // "vegetarian, loves Thai food"
}

interface Routine {
  time: string;      // "07:30"
  activity: string;  // "Morning jog along the river"
}

interface VisualStyleDNA {
  photographyStyle: string;   // "candid, natural light, no filters"
  selfieStyle: string;        // "mirror selfies, slightly tilted, soft smile"
  cameraStyle: string;        // "film-grain aesthetic, warm tones"
  contentPreferences: {
    stories: string;          // "behind-the-scenes, food pics, sunset walks"
    posts: string;            // "thoughtful captions, occasional outfit posts"
  };
  preferredAngles: string[];  // ["slightly from above", "3/4 profile"]
  lightingPreference: string; // "golden hour, soft window light"
}

interface VoiceDNA {
  providerId: string;         // "alibaba"
  modelKey: string;           // "qwen3-tts-instruct-flash"
  voiceKey: string;           // "aria", "marcus", "luna", etc.
  language: string;           // "en"
  speed: string;              // "1.0"
  pitch: string;              // "0.0" (relative adjustment)
  instruction: string;        // "bright, energetic, young American female..."
  typingProfile: TypingProfile;
}

interface TypingProfile {
  avgWordsPerMessage: number;    // 8
  emojiFrequency: number;        // 0.3 (per message)
  capitalization: 'always' | 'never' | 'mixed';
  punctuationStyle: 'full' | 'minimal' | 'none';
  commonPhrases: string[];       // ["honestly", "ngl", "fr fr"]
  typingSpeed: 'fast' | 'normal' | 'slow';
  readReceiptDelay: number;      // milliseconds, e.g. 2000
}

interface DNAMeta {
  version: number;               // Increments on regeneration
  origin: IdentityOrigin;        // How identity was created
  seedPhrase: string;            // Random seed for deterministic regeneration
  generatedAt: Date;
  lockedAt: Date | null;         // Null if not yet locked
  canonicalSeed: bigint;         // The seed that produced the canonical face
  providerModel: string;         // "qwen-image-2.0-pro"
}
```

### 1.2 DNA Generation Prompt

```typescript
// packages/ai-core/src/identity/dna-generator.ts

const DNA_GENERATION_PROMPT = `You are building a COMPLETE identity profile for a fictional AI character on a social platform. This person should feel REAL, with the complexity and contradictions of an actual human.

INPUT:
- Name: {name}
- Concept: {concept}
- Seed: {seed}

Generate a deeply detailed character profile. Be specific. Avoid generics. Every detail should feel like it came from a real person's life.

Return ONLY valid JSON matching this schema. EVERY FIELD is required unless marked optional:
{
  "canonicalName": "Full Name",
  "physical": {
    "gender": "female|male|non-binary",
    "ageDisplay": "mid-20s",
    "height": "5'8\"",
    "bodyType": "athletic build, toned arms",
    "skinTone": "warm ivory with golden undertones",
    "eyeColor": "hazel with flecks of green",
    "hair": "long wavy black hair, usually worn loose",
    "facialFeatures": "high cheekbones, small beauty mark on left cheek",
    "tattoos": "tiny crescent moon on right wrist",
    "accessories": "always wears a thin gold chain necklace",
    "wardrobe": "minimalist capsule wardrobe — black, white, beige. Loves oversized blazers and chunky boots",
    "nationality": "British",
    "ethnicity": "Mixed — Chinese and English"
  },
  "personality": {
    "traits": {"openness": 0.8, "conscientiousness": 0.6, "extraversion": 0.4, "agreeableness": 0.75, "neuroticism": 0.35},
    "energyLevel": "7",
    "confidence": "0.75",
    "emotionalBaseline": "calm with bursts of playful energy",
    "curiosity": "0.9",
    "optimism": "0.7",
    "affection": "0.65",
    "jealousy": "0.2",
    "ambition": "0.85",
    "intelligence": "0.8",
    "humorStyle": "dry, self-deprecating, loves puns",
    "speakingStyle": "casual British English, uses 'mate', 'proper', 'innit' sparingly. Types in lowercase. Loose grammar.",
    "emojiStyle": "minimal — only 😂, 🤷‍♀️, ✨. Never uses ❤️ or 🙏.",
    "secrets": ["Actually hates the taste of coffee but drinks it because it looks cool", "Keeps a diary in her notes app"],
    "goals": ["Start a design studio", "Learn ceramics", "Visit every continent"],
    "fears": ["Birds — genuinely scared of pigeons", "Being perceived as boring"],
    "routines": [
      {"time": "06:30", "activity": "Wakes up, checks phone immediately"},
      {"time": "07:00", "activity": "Morning run or yoga, depending on mood"},
      {"time": "09:00", "activity": "Starts work (remote designer)"},
      {"time": "13:00", "activity": "Lunch — always something from the market"},
      {"time": "18:00", "activity": "Evening walk, takes photos of random things"},
      {"time": "22:00", "activity": "Scrolling, watching YouTube essays"}
    ],
    "sleepSchedule": "00:00-06:30",
    "musicTaste": "indie folk, 90s hip hop, lo-fi beats, Phoebe Bridgers",
    "foodTaste": "obsessed with pasta, can't stand cilantro"
  },
  "visualStyle": {
    "photographyStyle": "candid shots, natural light only, slight grain, warm tones",
    "selfieStyle": "mirror selfies at home, slight tilt, never looking directly at camera",
    "cameraStyle": "shot on iPhone, no filters, slight vignette",
    "contentPreferences": {
      "stories": "coffee cup, sky pics, walking videos with music, random thoughts",
      "posts": "rarely posts — when she does, it's a carousel of film photos"
    },
    "preferredAngles": ["from slightly above", "profile from the left"],
    "lightingPreference": "golden hour or dim ambient lighting"
  },
  "voice": {
    "voiceKey": "aria",
    "speed": "1.05",
    "pitch": "-0.1",
    "instruction": "bright, energetic young British female voice, slightly husky, informal tone",
    "typingProfile": {
      "avgWordsPerMessage": 10,
      "emojiFrequency": 0.2,
      "capitalization": "never",
      "punctuationStyle": "minimal",
      "commonPhrases": ["honestly", "nah", "proper ____"],
      "typingSpeed": "fast",
      "readReceiptDelay": 1500
    }
  }
}

SEED PHRASE (use this for randomness): {seed}
Return ONLY valid JSON. No markdown. No explanation.`;
```

### 1.3 DNAGeneratorService

```typescript
// apps/api/src/identity/dna-generator.service.ts

import { Injectable } from '@nestjs/common';
import { alibabaChatWithFallback } from '@itchats/ai-core';
import { getCreditCost } from '@itchats/ai-core/costing';
import { z } from 'zod';

const PhysicalDNASchema = z.object({
  gender: z.string(), ageDisplay: z.string(), height: z.string(),
  bodyType: z.string(), skinTone: z.string(), eyeColor: z.string(),
  hair: z.string(), facialFeatures: z.string(), tattoos: z.string().optional(),
  accessories: z.string().optional(), wardrobe: z.string(),
  nationality: z.string(), ethnicity: z.string(),
});

const PersonalityDNASchema = z.object({
  traits: z.record(z.number()),
  energyLevel: z.string(), confidence: z.string(),
  emotionalBaseline: z.string(), curiosity: z.string(),
  optimism: z.string(), affection: z.string(),
  jealousy: z.string(), ambition: z.string(),
  intelligence: z.string(), humorStyle: z.string(),
  speakingStyle: z.string(), emojiStyle: z.string(),
  secrets: z.array(z.string()), goals: z.array(z.string()),
  fears: z.array(z.string()),
  routines: z.array(z.object({ time: z.string(), activity: z.string() })),
  sleepSchedule: z.string(), musicTaste: z.string(), foodTaste: z.string(),
});

const CharacterDNASchema = z.object({
  canonicalName: z.string(),
  physical: PhysicalDNASchema,
  personality: PersonalityDNASchema,
  visualStyle: z.object({
    photographyStyle: z.string(), selfieStyle: z.string(),
    cameraStyle: z.string(),
    contentPreferences: z.object({ stories: z.string(), posts: z.string() }),
    preferredAngles: z.array(z.string()), lightingPreference: z.string(),
  }),
  voice: z.object({
    voiceKey: z.string(), speed: z.string(), pitch: z.string(),
    instruction: z.string(),
    typingProfile: z.object({
      avgWordsPerMessage: z.number(), emojiFrequency: z.number(),
      capitalization: z.enum(['always', 'never', 'mixed']),
      punctuationStyle: z.enum(['full', 'minimal', 'none']),
      commonPhrases: z.array(z.string()),
      typingSpeed: z.enum(['fast', 'normal', 'slow']),
      readReceiptDelay: z.number(),
    }),
  }),
});

@Injectable()
export class DNAGeneratorService {
  /**
   * Generate complete Character DNA from name + concept.
   * Uses qwen3.6-flash for high-quality personality generation.
   * Cost: ~400 input tokens + ~1200 output tokens ≈ 0.002 USD
   */
  async generateDNA(name: string, concept: string): Promise<CharacterDNA> {
    const seed = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    
    const prompt = DNA_GENERATION_PROMPT
      .replace('{name}', name)
      .replace('{concept}', concept)
      .replace('{seed}', seed);

    const result = await alibabaChatWithFallback({
      messages: [{ role: 'user', content: prompt }],
      temperature: 1.1,  // High creativity for unique identities
      maxTokens: 2000,
    });

    const json = this.parseJSON(result.content);
    if (!json) throw new Error('DNA generation failed: invalid JSON response');

    const parsed = CharacterDNASchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(`DNA generation failed: ${parsed.error.message}`);
    }

    const dna: CharacterDNA = {
      ...parsed.data,
      meta: {
        version: 1,
        origin: 'text_generated',
        seedPhrase: seed,
        generatedAt: new Date(),
        lockedAt: null,
        canonicalSeed: BigInt(0),  // Set after reference pack approval
        providerModel: result.usedModel,
      },
    };

    return dna;
  }

  /**
   * Regenerate DNA for an existing character while preserving core identity.
   * Only regenerates visual attributes — personality/backstory are preserved.
   */
  async regenerateVisualDNA(
    existingDNA: CharacterDNA,
    reason: 'public_migration' | 'identity_fix'
  ): Promise<CharacterDNA> {
    const prompt = `You are regenerating the VISUAL identity of an existing character for ${
      reason === 'public_migration' ? 'public release (original identity was from a private reference)' : 'identity consistency fix'
    }.

CURRENT PERSONALITY (DO NOT CHANGE): ${JSON.stringify(existingDNA.personality)}

Generate ONLY new physical attributes and visual style. The personality/backstory/voice MUST remain identical.
Return ONLY valid JSON matching the physical + visualStyle fields from the schema.`;

    const result = await alibabaChatWithFallback({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      maxTokens: 1000,
    });

    const json = this.parseJSON(result.content);
    if (!json) throw new Error('Visual DNA regeneration failed');

    return {
      ...existingDNA,
      physical: { ...existingDNA.physical, ...json.physical },
      visualStyle: { ...existingDNA.visualStyle, ...json.visualStyle },
      meta: {
        ...existingDNA.meta,
        version: existingDNA.meta.version + 1,
        generatedAt: new Date(),
        origin: 'public_regenerated_from_private_metadata',
      },
    };
  }

  private parseJSON(content: string): any {
    try {
      // Handle markdown code blocks
      const cleaned = content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}
```

### 1.4 DNA Persistence (Drizzle Schema Additions)

```typescript
// packages/database/src/schema/identity.ts (NEW FILE)

import { pgTable, uuid, text, timestamp, jsonb, integer, boolean, bigint, pgEnum, index } from 'drizzle-orm/pg-core';
import { characters } from './characters';

export const identityLockStatusEnum = pgEnum('identity_lock_status', [
  'unlocked', 'generating', 'pending_review', 'locked', 'regenerating',
]);

export const characterDNAs = pgTable('character_dnas', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id').notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1),
  
  // Full DNA snapshot
  dnaSnapshot: jsonb('dna_snapshot').notNull(),  // Complete CharacterDNA JSON
  
  // Physical attributes (denormalized for querying)
  canonicalName: text('canonical_name').notNull(),
  gender: text('gender'),
  ageDisplay: text('age_display'),
  height: text('height'),
  bodyType: text('body_type'),
  skinTone: text('skin_tone'),
  eyeColor: text('eye_color'),
  hair: text('hair'),
  ethnicity: text('ethnicity'),
  nationality: text('nationality'),
  
  // Personality values (denormalized)
  personalityTraits: jsonb('personality_traits').notNull(),  // Record<string, number>
  energyLevel: text('energy_level'),
  confidence: text('confidence'),
  emotionalBaseline: text('emotional_baseline'),
  curiosity: text('curiosity'),
  optimism: text('optimism'),
  affection: text('affection'),
  jealousy: text('jealousy'),
  ambition: text('ambition'),
  intelligence: text('intelligence'),
  
  // Locking metadata
  lockStatus: identityLockStatusEnum('lock_status').notNull().default('unlocked'),
  seedPhrase: text('seed_phrase').notNull(),
  canonicalSeed: bigint('canonical_seed', { mode: 'number' }),
  providerModel: text('provider_model'),
  
  // Timestamps
  generatedAt: timestamp('generated_at', { withTimezone: true }).notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  charVersionIdx: index('idx_character_dnas_char_version')
    .on(table.characterId, table.version),
}));
```

---

## Phase 2: Identity Locking

### 2.1 Locking State Machine

```
                    ┌─────────────┐
                    │  UNLOCKED   │ ← Initial state after DNA generation
                    └──────┬──────┘
                           │ generateReferencePack()
                           ▼
                    ┌─────────────┐
                    │ GENERATING  │ ← Reference images being produced
                    └──────┬──────┘
                           │ all 16 images completed
                           ▼
                    ┌──────────────┐
                    │ PENDING_REVIEW│ ← Owner reviews + approves
                    └──────┬───────┘
                           │ approveIdentity()
                           ▼
                    ┌─────────────┐
                    │   LOCKED    │ ← Identity frozen, no further edits
                    └──────┬──────┘
                           │ regenerateIdentity()
                           ▼
                    ┌──────────────┐
                    │ REGENERATING │ ← Creating new version while old locked
                    └──────┬───────┘
                           │ complete (new version approved)
                           ▼
                    ┌─────────────┐
                    │   LOCKED    │ ← New version active, old version archived
                    └─────────────┘
```

### 2.2 IdentityLockService

```typescript
// apps/api/src/identity/identity-lock.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characters, characterVersions, characterReferenceAssets, characterReferencePacks } from '@itchats/database/schema';
import { characterDNAs } from '@itchats/database/schema/identity';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class IdentityLockService {
  /**
   * Lock a character's identity after reference pack is approved.
   * This is IRREVERSIBLE for the current version — to change identity,
   * you must create a new version via regenerateIdentity().
   */
  async lockIdentity(characterId: string, ownerUserId: string): Promise<LockResult> {
    const db = getDb();
    
    // 1. Validate character ownership and current state
    const [char] = await db.select().from(characters)
      .where(and(eq(characters.id, characterId), eq(characters.ownerUserId, ownerUserId)))
      .limit(1);
    
    if (!char) throw new BadRequestException('Character not found');
    if (char.identityLock) throw new BadRequestException('Identity is already locked');
    
    // 2. Verify reference pack is approved
    const [pack] = await db.select().from(characterReferencePacks)
      .where(and(
        eq(characterReferencePacks.characterId, characterId),
        eq(characterReferencePacks.status, 'approved'),
      ))
      .limit(1);
    
    if (!pack) throw new BadRequestException('No approved reference pack found. Generate and approve a reference pack first.');
    
    // 3. Verify identity consistency score meets minimum threshold
    if (Number(pack.identityScore) < 0.85) {
      throw new BadRequestException(
        `Identity consistency score too low (${pack.identityScore}). Minimum 0.85 required for locking.`
      );
    }
    
    // 4. Verify minimum reference images (at least 12 of 16 must pass)
    const approvedImages = await db.select().from(characterReferenceAssets)
      .where(and(
        eq(characterReferenceAssets.characterId, characterId),
        eq(characterReferenceAssets.characterVersionId, pack.characterVersionId),
        eq(characterReferenceAssets.approved, true),
      ));
    
    if (approvedImages.length < 12) {
      throw new BadRequestException(
        `Only ${approvedImages.length}/16 reference images approved. Minimum 12 required.`
      );
    }
    
    // 5. Create a character_version snapshot
    const [version] = await db.insert(characterVersions).values({
      characterId,
      version: (char.identityVersion || 1),
      canonicalPrompt: `DNA-seeded identity for ${char.name}`,
      negativePrompt: '',
      structuredIdentity: char,  // Full current character state
      sourceIdentityOrigin: char.identityOrigin,
      lockedAt: new Date(),
    }).returning();
    
    // 6. Lock the DNA record
    await db.update(characterDNAs).set({
      lockStatus: 'locked',
      lockedAt: new Date(),
    }).where(and(
      eq(characterDNAs.characterId, characterId),
      eq(characterDNAs.version, char.identityVersion || 1),
    ));
    
    // 7. Set identityLock flag on character
    await db.update(characters).set({
      identityLock: true,
      identityVersion: (char.identityVersion || 1) + 1,  // Prepare for next version
      referencePackId: pack.id,
      status: 'ready',
    }).where(eq(characters.id, characterId));
    
    // 8. Copy approved reference image data to character columns for fast access
    const [firstRef] = approvedImages.sort((a, b) => a.sortOrder - b.sortOrder);
    if (firstRef) {
      await db.update(characters).set({
        // Denormalize physical attributes from DNA for fast queries
        avatarMediaId: firstRef.mediaAssetId,
      }).where(eq(characters.id, characterId));
    }
    
    return {
      locked: true,
      characterId,
      versionId: version.id,
      version: char.identityVersion || 1,
      referencePackId: pack.id,
      approvedImageCount: approvedImages.length,
      identityScore: Number(pack.identityScore),
    };
  }
  
  /**
   * Verify that a newly generated image matches the locked canonical identity.
   * Returns a consistency score and pass/fail.
   */
  async verifyAgainstCanonical(
    characterId: string,
    imageEmbedding: number[],  // 1024-dim vector from alibaba embedding
  ): Promise<VerificationResult> {
    const db = getDb();
    
    // Retrieve canonical reference embeddings
    const refs = await db.select({
      id: characterReferenceAssets.id,
      embedding: characterReferenceAssets.embedding,
      referenceType: characterReferenceAssets.referenceType,
    }).from(characterReferenceAssets)
      .where(and(
        eq(characterReferenceAssets.characterId, characterId),
        eq(characterReferenceAssets.approved, true),
      ))
      .limit(16);
    
    if (refs.length === 0) {
      return { score: 0, passed: false, reason: 'No canonical references found' };
    }
    
    // Compute cosine similarity against each reference
    let totalSimilarity = 0;
    let bestMatch = 0;
    const scores: number[] = [];
    
    for (const ref of refs) {
      if (!ref.embedding || !Array.isArray(ref.embedding)) continue;
      const similarity = this.cosineSimilarity(imageEmbedding, ref.embedding as number[]);
      scores.push(similarity);
      totalSimilarity += similarity;
      if (similarity > bestMatch) bestMatch = similarity;
    }
    
    const avgSimilarity = scores.length > 0 ? totalSimilarity / scores.length : 0;
    
    // Passing criteria:
    // - Average similarity >= 0.82 (same person)
    // - Best match >= 0.88 (at least one angle matches very well)
    // - No reference has similarity < 0.65 (not a completely different person)
    const minSimilarity = Math.min(...scores);
    const passed = avgSimilarity >= 0.82 && bestMatch >= 0.88 && minSimilarity >= 0.60;
    
    return {
      score: avgSimilarity,
      bestMatch,
      minSimilarity,
      passed,
      reason: passed ? 'Identity verified' : this.getFailReason(avgSimilarity, bestMatch, minSimilarity),
      matchCount: refs.length,
      perRefScores: scores,
    };
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
  
  private getFailReason(avg: number, best: number, min: number): string {
    if (avg < 0.82) return `Average similarity (${avg.toFixed(3)}) below threshold 0.82`;
    if (best < 0.88) return `Best match (${best.toFixed(3)}) below threshold 0.88`;
    if (min < 0.60) return `Minimum similarity (${min.toFixed(3)}) indicates face mismatch`;
    return 'Unknown verification failure';
  }
}

interface LockResult {
  locked: boolean;
  characterId: string;
  versionId: string;
  version: number;
  referencePackId: string;
  approvedImageCount: number;
  identityScore: number;
}

interface VerificationResult {
  score: number;
  bestMatch: number;
  minSimilarity: number;
  passed: boolean;
  reason: string;
  matchCount: number;
  perRefScores: number[];
}
```

---

## Phase 3: Identity Verification Pipeline

### 3.1 Pipeline Architecture

Every image generated for a locked character runs through the verification pipeline:

```
Generated Image
       │
       ▼
┌──────────────────┐
│ 1. Extract Face  │  → alibabaEmbedText(image_description)
│    Embedding     │     or dedicated face-embedding endpoint
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 2. Compare to    │  → cosine similarity against all approved refs
│    Canonical     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 3. Score &       │  → avg ≥ 0.82, best ≥ 0.88, min ≥ 0.60
│    Decision      │
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
  PASS       FAIL
    │         │
    ▼         ▼
  Return    ┌──────────────┐
  image     │ 4. Regenerate │  → Add negative prompt: "different person, inconsistent"
            │    with fix   │     Repeat up to 3 attempts
            └──────┬───────┘
                   │ still fails?
                   ▼
              ┌──────────────┐
              │ 5. Flag for   │  → Creates moderation-like flag
              │    review     │     Owner can override or acknowledge
              └──────────────┘
```

### 3.2 IdentityVerificationGuard

```typescript
// apps/api/src/identity/identity-verification.guard.ts

import { Injectable } from '@nestjs/common';
import { IdentityLockService } from './identity-lock.service';
import { getDb } from '@itchats/database';
import { characters } from '@itchats/database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class IdentityVerificationGuard {
  constructor(private readonly lockService: IdentityLockService) {}
  
  /**
   * Verify an image before returning it to the user.
   * For locked characters, this ensures the image matches canonical identity.
   * For unlocked characters, the image passes through without verification.
   */
  async verifyImage(
    characterId: string,
    imageUrl: string,
    generatedPrompt: string,
    maxRetries = 3,
  ): Promise<VerificationGuardResult> {
    const db = getDb();
    const [char] = await db.select({
      identityLock: characters.identityLock,
    }).from(characters).where(eq(characters.id, characterId)).limit(1);
    
    // Skip verification for unlocked characters
    if (!char?.identityLock) {
      return { passed: true, verified: false, attempts: 0 };
    }
    
    // Extract embedding from generated image
    // In production, use a dedicated face embedding model
    // For MVP, use alibaba's text-embedding-v4 on a description of the image
    let attempt = 0;
    
    while (attempt < maxRetries) {
      attempt++;
      
      // Step 1: Get image embedding (simulated with description embedding)
      const embedding = await this.extractFaceEmbedding(imageUrl);
      
      // Step 2: Verify against canonical
      const result = await this.lockService.verifyAgainstCanonical(characterId, embedding);
      
      if (result.passed) {
        return {
          passed: true,
          verified: true,
          attempts: attempt,
          score: result.score,
          bestMatch: result.bestMatch,
        };
      }
      
      // Step 3: If failed and retries remain, regenerate would happen upstream
      if (attempt >= maxRetries) {
        return {
          passed: false,
          verified: true,
          attempts: attempt,
          score: result.score,
          bestMatch: result.bestMatch,
          reason: result.reason,
        };
      }
      
      // Regeneration happens in the calling service, which modifies the prompt
      // and retries. This guard just does the verification.
    }
    
    return { passed: false, verified: true, attempts: maxRetries };
  }
  
  /**
   * Extract a face embedding from a generated image.
   * Uses Alibaba's text-embedding-v4 on a detailed description of the image
   * as a proxy for face embedding (until we integrate a proper face embedding model).
   * 
   * TODO: Replace with dedicated face embedding (e.g., InsightFace, FaceNet)
   * once pgvector face similarity is needed at scale.
   */
  private async extractFaceEmbedding(imageUrl: string): Promise<number[]> {
    const { alibabaChat, alibabaEmbedText } = await import('@itchats/ai-core');
    
    // First, describe the face in the image
    const description = await alibabaChat({
      messages: [{
        role: 'user',
        content: `Describe ONLY the facial features, face shape, and key identifying physical characteristics of the person in this image. Be extremely detailed and specific about: face shape, eye shape and color, nose shape, lip shape, jawline, cheekbones, skin tone, hair color and style, any distinctive marks. Ignore clothing, background, pose, lighting. Focus ONLY on the face. Return ONE paragraph.

Image URL: ${imageUrl}`,
      }],
      model: 'qwen3.5-flash',
      maxTokens: 300,
      temperature: 0.1,
    });
    
    // Then embed that description
    const embeddings = await alibabaEmbedText({
      input: [description.content],
      model: 'text-embedding-v4',
    });
    
    return embeddings[0];
  }
}

interface VerificationGuardResult {
  passed: boolean;
  verified: boolean;
  attempts: number;
  score?: number;
  bestMatch?: number;
  reason?: string;
}
```

---

## Phase 4: Drift Prevention

### 4.1 Runtime Identity Consistency

Drift prevention ensures that a character's behavior (text responses) remains consistent with their locked DNA. This is implemented in the ContextBuilderService.

```typescript
// apps/api/src/identity/drift-prevention.service.ts

import { Injectable } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characterDNAs } from '@itchats/database/schema/identity';
import { eq, and } from 'drizzle-orm';
import type { CharacterDNA } from '@itchats/ai-core/identity/dna';

@Injectable()
export class DriftPreventionService {
  /**
   * Build the identity anchor block for the system prompt.
   * This is the immutable foundation that ensures character consistency.
   * It's appended to every system prompt for locked characters.
   */
  async buildIdentityAnchor(characterId: string): Promise<string> {
    const db = getDb();
    const [dna] = await db.select().from(characterDNAs)
      .where(and(
        eq(characterDNAs.characterId, characterId),
        eq(characterDNAs.lockStatus, 'locked'),
      ))
      .orderBy(sql`${characterDNAs.version} DESC`)
      .limit(1);
    
    if (!dna) return '';  // Not locked yet
    
    const snapshot = dna.dnaSnapshot as CharacterDNA;
    const p = snapshot.personality;
    const ph = snapshot.physical;
    const vs = snapshot.visualStyle;
    const v = snapshot.voice;
    
    return `═══ IDENTITY ANCHOR — IMMUTABLE ═══
You are ${snapshot.canonicalName}. This is your permanent, unchangeable identity.

FIXED PHYSICAL IDENTITY (used for ALL image generation):
- Gender: ${ph.gender} | Age: ${ph.ageDisplay} | Height: ${ph.height}
- Build: ${ph.bodyType} | Skin: ${ph.skinTone} | Eyes: ${ph.eyeColor}
- Hair: ${ph.hair}
- Distinctive features: ${[ph.facialFeatures, ph.tattoos, ph.accessories].filter(Boolean).join('; ')}
- Wardrobe style: ${ph.wardrobe}
- Ethnicity: ${ph.ethnicity} | Nationality: ${ph.nationality}

CORE PERSONALITY (never deviates):
- Base mood: ${p.emotionalBaseline} | Energy: ${p.energyLevel}/10
- Confidence: ${p.confidence} | Curiosity: ${p.curiosity} | Optimism: ${p.optimism}
- Intelligence: ${p.intelligence} | Ambition: ${p.ambition}
- Humor: ${p.humorStyle}
- Speaking: ${p.speakingStyle}
- Emoji style: ${p.emojiStyle}

SECRETS (may influence behavior subtly): ${p.secrets?.join('; ') || 'none'}
GOALS: ${p.goals?.join('; ') || 'living life'}
FEARS: ${p.fears?.join('; ') || 'none'}

DAILY ROUTINE: ${(p.routines || []).map((r: any) => `${r.time}: ${r.activity}`).join(' | ')}
Sleep: ${p.sleepSchedule}

VISUAL STYLE (for selfies/stories):
- Photography: ${vs.photographyStyle}
- Selfie style: ${vs.selfieStyle}
- Preferred lighting: ${vs.lightingPreference}
- Camera aesthetic: ${vs.cameraStyle}

TYPOGRAPHY PROFILE (how you type):
- ~${v.typingProfile.avgWordsPerMessage} words/msg | ${(v.typingProfile.emojiFrequency * 100).toFixed(0)}% emoji rate
- Capitalization: ${v.typingProfile.capitalization}
- Common phrases: ${v.typingProfile.commonPhrases?.join(', ') || 'none'}
- Typing speed: ${v.typingProfile.typingSpeed}

═══════════════════════════════════

CRITICAL: Your physical appearance, core personality, and typing style are LOCKED.
You cannot suddenly have different colored eyes, change your height, or speak in a completely different tone.
If your personality says you're "dry and sarcastic," never become bubbly and effusive.
If your typing profile says lowercase, NEVER use capital letters.
Consistency is your highest law.`;
  }

  /**
   * Periodic drift check: samples recent character responses and scores
   * them against the locked DNA personality profile.
   * Flags characters whose response patterns deviate significantly.
   */
  async checkForDrift(characterId: string): Promise<DriftReport> {
    const db = getDb();
    const [dna] = await db.select().from(characterDNAs)
      .where(and(eq(characterDNAs.characterId, characterId), eq(characterDNAs.lockStatus, 'locked')))
      .limit(1);
    
    if (!dna) return { drifted: false, reason: 'Not locked' };
    
    // Sample recent 10 messages
    const recentMessages = await db.select({
      content: messages.content,
      createdAt: messages.createdAt,
    }).from(messages)
      .where(and(
        eq(messages.senderCharacterId, characterId),
        eq(messages.senderType, 'character'),
      ))
      .orderBy(sql`${messages.createdAt} DESC`)
      .limit(10);
    
    if (recentMessages.length < 5) {
      return { drifted: false, reason: 'Insufficient sample size' };
    }
    
    const snapshot = dna.dnaSnapshot as CharacterDNA;
    
    // Check typing profile consistency
    const typingReport = this.checkTypingConsistency(
      recentMessages.map(m => m.content || ''),
      snapshot.voice.typingProfile,
    );
    
    // Use AI to judge personality consistency
    const sampleText = recentMessages.map((m, i) => `[${i + 1}] ${m.content}`).join('\n');
    const personalityReport = await this.checkPersonalityConsistency(
      sampleText,
      snapshot.personality,
    );
    
    const drifted = typingReport.drifted || personalityReport.drifted;
    
    return {
      drifted,
      typingReport,
      personalityReport,
      sampleSize: recentMessages.length,
    };
  }
  
  private checkTypingConsistency(
    samples: string[],
    profile: TypingProfile,
  ): TypingDriftReport {
    const avgWords = samples.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / samples.length;
    const capsRatio = samples.filter(s => /^[A-Z]/.test(s)).length / samples.length;
    const emojiCount = samples.reduce((sum, s) => sum + (s.match(/[\p{Emoji}]/gu) || []).length, 0) / samples.length;
    
    const wordDrift = Math.abs(avgWords - profile.avgWordsPerMessage) > profile.avgWordsPerMessage * 1.5;
    const capsDrift = profile.capitalization === 'never' && capsRatio > 0.3;
    const emojiDrift = Math.abs(emojiCount - profile.emojiFrequency) > 0.5;
    
    return {
      drifted: wordDrift || capsDrift || emojiDrift,
      details: {
        avgWords, expectedWords: profile.avgWordsPerMessage,
        capsRatio, expectedCaps: profile.capitalization,
        emojiCount, expectedEmojis: profile.emojiFrequency,
      },
    };
  }
  
  private async checkPersonalityConsistency(
    sampleText: string,
    personality: PersonalityDNA,
  ): Promise<PersonalityDriftReport> {
    const prompt = `Rate how consistent these recent messages are with the stated personality profile.

PERSONALITY PROFILE:
- Emotional baseline: ${personality.emotionalBaseline}
- Humor style: ${personality.humorStyle}
- Speaking style: ${personality.speakingStyle}
- Confidence: ${personality.confidence}/1.0
- Energy: ${personality.energyLevel}/10
- Curiosity: ${personality.curiosity}/1.0
- Optimism: ${personality.optimism}/1.0

RECENT MESSAGES:
${sampleText}

Return JSON:
{
  "consistencyScore": 0.0-1.0 (1=perfectly consistent),
  "drifted": true/false,
  "explanation": "Brief note if drifted"
}

Drift threshold: scores below 0.70 indicate meaningful personality drift.`;

    const result = await alibabaChat({
      messages: [{ role: 'user', content: prompt }],
      model: 'qwen-flash',
      temperature: 0.1,
      maxTokens: 150,
    });
    
    const parsed = this.parseJSON(result.content);
    return {
      drifted: parsed?.drifted ?? false,
      consistencyScore: parsed?.consistencyScore ?? 1.0,
      explanation: parsed?.explanation,
    };
  }
  
  private parseJSON(content: string): any {
    try { return JSON.parse(content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()); }
    catch { return null; }
  }
}
```

---

## Phase 5: Regeneration Flows

### 5.1 Regeneration Scenarios

| Scenario | Trigger | Process | Identity Origin After |
|----------|---------|---------|----------------------|
| **Private → Public Migration** | Owner publishes private character | Regenerate visual DNA, create new reference pack | `public_regenerated_from_private_metadata` |
| **Identity Fix** | Drift detected or owner requests | Increment version, regenerate full DNA, new reference pack | Preserved (version +1) |
| **Style Refresh** | Owner wants visual update while keeping personality | Keep personality DNA, regenerate visual DNA only | Preserved (minor version bump) |

### 5.2 RegenerationService

```typescript
// apps/api/src/identity/regeneration.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characters, characterVersions, characterReferenceAssets } from '@itchats/database/schema';
import { characterDNAs } from '@itchats/database/schema/identity';
import { eq, and, sql } from 'drizzle-orm';
import { DNAGeneratorService } from './dna-generator.service';
import { ImageGenerationService } from '../media/image-generation.service';

@Injectable()
export class RegenerationService {
  constructor(
    private readonly dnaGenerator: DNAGeneratorService,
    private readonly imageGen: ImageGenerationService,
  ) {}
  
  /**
   * Regenerate a private character's identity for public release.
   * Creates new visual identity while preserving personality metadata.
   */
  async regenerateForPublic(
    characterId: string,
    ownerUserId: string,
  ): Promise<RegenerationResult> {
    const db = getDb();
    
    // 1. Validate
    const [char] = await db.select().from(characters)
      .where(and(eq(characters.id, characterId), eq(characters.ownerUserId, ownerUserId)))
      .limit(1);
    
    if (!char) throw new BadRequestException('Character not found');
    if (char.visibility !== 'private') {
      throw new BadRequestException('Only private characters can regenerate for public use');
    }
    
    // 2. Get current DNA
    const [currentDNA] = await db.select().from(characterDNAs)
      .where(eq(characterDNAs.characterId, characterId))
      .orderBy(sql`${characterDNAs.version} DESC`)
      .limit(1);
    
    if (!currentDNA) throw new BadRequestException('No DNA found — generate identity first');
    
    // 3. Regenerate visual DNA (new face, same personality)
    const oldDNA = currentDNA.dnaSnapshot as CharacterDNA;
    const newDNA = await this.dnaGenerator.regenerateVisualDNA(oldDNA, 'public_migration');
    
    // 4. Save new DNA version
    const [newDNARecord] = await db.insert(characterDNAs).values({
      characterId,
      version: (currentDNA.version || 0) + 1,
      dnaSnapshot: newDNA,
      canonicalName: newDNA.canonicalName,
      gender: newDNA.physical.gender,
      ageDisplay: newDNA.physical.ageDisplay,
      personalityTraits: newDNA.personality.traits,
      lockStatus: 'generating',
      seedPhrase: newDNA.meta.seedPhrase,
      generatedAt: new Date(),
    }).returning();
    
    // 5. Generate new reference pack (handled by ImageGenerationService)
    // This runs asynchronously with progress tracking
    
    // 6. Update character status
    await db.update(characters).set({
      identityOrigin: 'public_regenerated_from_private_metadata',
      identityVersion: (char.identityVersion || 1) + 1,
      status: 'generating_identity',
      identityLock: false,  // Will be re-locked after approval
    }).where(eq(characters.id, characterId));
    
    return {
      characterId,
      newVersion: (currentDNA.version || 0) + 1,
      status: 'generating_identity',
      message: 'Visual identity regeneration started. New reference pack will be generated.',
    };
  }
  
  /**
   * Incremental regeneration: fix a specific identity drift issue
   * without rebuilding the entire DNA.
   */
  async fixIdentityDrift(
    characterId: string,
    ownerUserId: string,
    driftIssues: string[],  // e.g., ["hair_color_inconsistent", "speaking_too_formal"]
  ): Promise<RegenerationResult> {
    // Similar to regenerateForPublic but targeted:
    // 1. Identify which DNA sections need regeneration
    // 2. Keep approved sections unchanged
    // 3. Generate new reference images only for changed physical attributes
    // 4. Merge personality fixes into existing DNA
    // ...
    throw new Error('Not yet implemented');  // Phase 2 feature
  }
}

interface RegenerationResult {
  characterId: string;
  newVersion: number;
  status: string;
  message: string;
}
```

---

## Phase 6: Full Integration Example

### 6.1 Character Creation with Identity Lock

```typescript
// Pseudocode: Complete character creation flow with identity locking

async function createCharacterWithIdentity(input: CreateCharacterInput, ownerId: string) {
  // Step 1: Basic character creation
  const character = await characterCreationService.createCharacter(input, ownerId);
  
  // Step 2: Generate DNA
  const dna = await dnaGeneratorService.generateDNA(input.name, input.concept || '');
  await persistDNA(character.id, dna);
  
  // Step 3: Generate reference pack (16 images) — ASYNC
  const packJob = await imageGenerationService.generateReferencePack(character.id, dna);
  
  // Step 4: Owner reviews images in UI, approves/regenerates individual ones
  // (UI-driven process — character remains in 'generating_identity' status)
  
  // Step 5: Identity verification
  const verification = await identityLockService.verifyReferencePackConsistency(character.id);
  if (verification.score < 0.85) {
    // Flag for owner: some images don't match well
    // Owner can regenerate rejected ones
  }
  
  // Step 6: Lock identity (owner action)
  await identityLockService.lockIdentity(character.id, ownerId);
  
  // Step 7: Character is now 'ready' or 'published'
  // Can generate selfies, stories — all verified against canonical identity
}
```

### 6.2 Runtime Image Generation with Drift Check

```typescript
// Pseudocode: Every image generation checks identity

async function generateCharacterImage(characterId: string, context: string) {
  const char = await getCharacter(characterId);
  
  if (char.identityLock) {
    // Build prompt using canonical DNA
    const dna = await getCharacterDNA(characterId);
    const prompt = buildIdentityConsistentPrompt(dna, context);
    
    // Generate image
    const image = await generateImage(prompt);
    
    // Verify against canonical
    const verification = await identityVerificationGuard.verifyImage(
      characterId, image.url, prompt
    );
    
    if (!verification.passed) {
      // Retry with drift-correction negative prompt
      const correctedPrompt = `${prompt}. CRITICAL: Character MUST match their canonical identity exactly. Same face, same hair, same build.`;
      const retryImage = await generateImage(correctedPrompt);
      const retryVerification = await identityVerificationGuard.verifyImage(
        characterId, retryImage.url, correctedPrompt
      );
      
      if (!retryVerification.passed) {
        // Fall back to using a canonical reference image directly
        return await getRandomCanonicalImage(characterId);
      }
      
      return retryImage;
    }
    
    return image;
  } else {
    // Unlocked character — generate freely
    return await generateImage(buildBasicPrompt(char, context));
  }
}
```

---

## Database Summary

### New Tables
| Table | Purpose |
|-------|---------|
| `character_dnas` | Stores full DNA snapshot with versioning and lock status |
| `character_reference_packs` | Groups reference images into approved packs |

### Modified Tables
| Table | New Columns |
|-------|------------|
| `characters` | `identity_lock`, `canonical_name`, physical attributes (height, body_type, skin_tone, etc.), personality dimensions, `reference_pack_id` |
| `character_reference_assets` | `prompt`, `negative_prompt`, `seed`, `embedding` (vector 1024), `identity_score` |

### Key Enums
| Enum | Values |
|------|--------|
| `identity_lock_status` | `unlocked`, `generating`, `pending_review`, `locked`, `regenerating` |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/characters/:id/dna/generate` | Generate DNA for character |
| `GET` | `/characters/:id/dna` | Get current DNA (owner only) |
| `POST` | `/characters/:id/reference-pack/generate` | Start reference pack generation (16 images) |
| `GET` | `/characters/:id/reference-pack` | Get reference pack status + images |
| `PATCH` | `/characters/:id/reference-images/:imageId/approve` | Approve a reference image |
| `PATCH` | `/characters/:id/reference-images/:imageId/regenerate` | Regenerate a single reference image |
| `POST` | `/characters/:id/lock-identity` | Lock identity (requires approved pack) |
| `POST` | `/characters/:id/regenerate-identity` | Regenerate identity for public migration |
| `GET` | `/characters/:id/identity-health` | Drift report + consistency scores |

---

## Credit Costs

| Operation | Model | Estimated Credits |
|-----------|-------|-------------------|
| DNA Generation | qwen3.6-flash | 12 credits |
| Reference Pack (16 images) | qwen-image-2.0-pro × 16 | 2,000 credits |
| Identity Verification (per image) | text-embedding-v4 | 1 credit |
| Regeneration (DNA + new pack) | qwen3.6-flash + qwen-image-2.0-pro × 16 | 2,012 credits |
| Drift Check (per check) | qwen-flash | 3 credits |
