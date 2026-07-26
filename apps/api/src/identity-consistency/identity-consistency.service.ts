import { Injectable, Logger } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characters, characterReferencePacks, characterReferenceAssets } from '@itchats/database/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Identity Consistency Service
 *
 * Responsibilities:
 * - Face similarity comparison (textual for MVP, embedding-based in future)
 * - Identity score calculation
 * - Drift detection and rejection
 * - Canonical reference selection
 * - Identity verification before publishing
 */
@Injectable()
export class IdentityConsistencyService {
  private readonly logger = new Logger(IdentityConsistencyService.name);
  /** Minimum identity score threshold for accepting a generated image */
  private readonly IDENTITY_THRESHOLD = 0.75;

  /**
   * Verify that a newly generated image matches the character's canonical identity.
   * In the MVP, this uses prompt similarity + character attribute matching.
   * Future: use face embedding comparison via alibabaEmbedText or dedicated face model.
   */
  async verifyIdentity(
    characterId: string,
    generatedPrompt: string,
    generatedImageUrl: string,
  ): Promise<{ passed: boolean; score: number; reason?: string }> {
    const db = getDb();

    // Get the approved reference pack
    const [pack] = await db.select().from(characterReferencePacks)
      .where(and(
        eq(characterReferencePacks.characterId, characterId),
        eq(characterReferencePacks.status, 'approved'),
      ))
      .orderBy(desc(characterReferencePacks.approvedAt))
      .limit(1);

    if (!pack) {
      return { passed: true, score: 1.0, reason: 'No approved reference pack — skipping verification' };
    }

    // Get character DNA for comparison
    const [char] = await db.select().from(characters)
      .where(eq(characters.id, characterId)).limit(1);
    if (!char) return { passed: false, score: 0, reason: 'Character not found' };

    // For MVP: compare prompt similarity using key identity markers
    const identityMarkers = [
      char.gender,
      char.ageDisplay,
      char.ethnicity,
      char.skinTone,
      char.eyeColor,
      char.hair,
      char.bodyType,
      char.height,
    ].filter(Boolean) as string[];

    const promptLower = generatedPrompt.toLowerCase();
    let matchCount = 0;
    for (const marker of identityMarkers) {
      if (promptLower.includes(marker.toLowerCase())) matchCount++;
    }

    const score = identityMarkers.length > 0
      ? matchCount / identityMarkers.length
      : 0.8; // Default pass if no markers defined

    const passed = score >= this.IDENTITY_THRESHOLD;

    if (!passed) {
      this.logger.warn(
        `Identity drift detected for ${char.name}: score=${score.toFixed(2)}, ` +
        `matched ${matchCount}/${identityMarkers.length} markers`,
      );
    }

    return {
      passed,
      score: Math.round(score * 100) / 100,
      reason: passed ? undefined : `Identity score ${(score * 100).toFixed(0)}% below threshold ${(this.IDENTITY_THRESHOLD * 100).toFixed(0)}%`,
    };
  }

  /**
   * Calculate the aggregate identity score for a reference pack.
   * Combines individual image quality scores and identity consistency.
   */
  async calculatePackIdentityScore(packId: string): Promise<number> {
    const db = getDb();
    const images = await db.select({
      qualityScore: characterReferenceAssets.qualityScore,
      identityScore: characterReferenceAssets.identityScore,
    }).from(characterReferenceAssets)
      .where(eq(characterReferenceAssets.referencePackId, packId));

    if (images.length === 0) return 0;

    let totalQuality = 0;
    let totalIdentity = 0;
    let count = 0;

    for (const img of images) {
      const qs = Number(img.qualityScore) || 0.8;
      const is = Number(img.identityScore) || 0.85;
      totalQuality += qs;
      totalIdentity += is;
      count++;
    }

    // Weighted: 60% identity consistency, 40% quality
    const avgQuality = totalQuality / count;
    const avgIdentity = totalIdentity / count;
    const score = avgIdentity * 0.6 + avgQuality * 0.4;

    // Update the pack
    await db.update(characterReferencePacks).set({
      identityScore: String(score),
    } as any).where(eq(characterReferencePacks.id, packId));

    return Math.round(score * 10000) / 10000;
  }

  /**
   * Select the best reference image for a given use case.
   */
  async selectBestReference(characterId: string, referenceType: string): Promise<string | null> {
    const db = getDb();

    // Try exact type match first
    const [exact] = await db.select().from(characterReferenceAssets)
      .where(and(
        eq(characterReferenceAssets.characterId, characterId),
        eq(characterReferenceAssets.referenceType, referenceType),
        eq(characterReferenceAssets.approved, true as any),
      ))
      .orderBy(desc(characterReferenceAssets.qualityScore))
      .limit(1);

    if (exact) return exact.mediaAssetId;

    // Fallback to portrait
    const [portrait] = await db.select().from(characterReferenceAssets)
      .where(and(
        eq(characterReferenceAssets.characterId, characterId),
        eq(characterReferenceAssets.referenceType, 'portrait'),
        eq(characterReferenceAssets.approved, true as any),
      ))
      .limit(1);

    return portrait?.mediaAssetId || null;
  }

  /**
   * Check if a character's identity is locked and cannot be modified.
   */
  async isIdentityLocked(characterId: string): Promise<boolean> {
    const db = getDb();
    const [char] = await db.select({ identityLock: characters.identityLock })
      .from(characters).where(eq(characters.id, characterId)).limit(1);
    return char?.identityLock ?? false;
  }

  /**
   * Get identity verification status for admin review.
   */
  async getIdentityStatus(characterId: string) {
    const db = getDb();
    const [char] = await db.select({
      id: characters.id,
      name: characters.name,
      identityLock: characters.identityLock,
      identityVersion: characters.identityVersion,
      referencePackId: characters.referencePackId,
      status: characters.status,
    }).from(characters).where(eq(characters.id, characterId)).limit(1);

    if (!char) return null;

    const packs = await db.select().from(characterReferencePacks)
      .where(eq(characterReferencePacks.characterId, characterId))
      .orderBy(desc(characterReferencePacks.createdAt))
      .limit(5);

    return {
      character: char,
      referencePacks: packs.map(p => ({
        id: p.id,
        status: p.status,
        imageCount: p.imageCount,
        identityScore: Number(p.identityScore) || null,
        generatedAt: p.generatedAt,
        approvedAt: p.approvedAt,
      })),
      isLocked: char.identityLock,
    };
  }
}
