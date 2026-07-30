import { Injectable, Logger } from '@nestjs/common';
import { getDb } from '@itchats/database';
import {
  characters,
  characterAutonomy,
  posts,
  creditWallets,
  creditLedger,
} from '@itchats/database/schema';
import { eq, and, sql, isNull, lt, gte } from 'drizzle-orm';
import { alibabaChat } from '@itchats/ai-core';

@Injectable()
export class AutonomyService {
  private readonly logger = new Logger(AutonomyService.name);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Start the autonomous actions cron job (runs every 15 minutes).
   */
  startScheduler() {
    if (this.intervalId) return;
    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.scheduleAutonomousActions().catch((err) => {
        this.logger.error(`Autonomy scheduler error: ${err.message}`);
      });
    }, FIFTEEN_MINUTES);
    this.logger.log('Autonomy scheduler started (15min interval)');
  }

  stopScheduler() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async scheduleAutonomousActions() {
    const db = getDb();

    // ── Renew media budgets whose next renewal is past due ──
    await this.renewMediaBudgets();

    // Get all active autonomy-enabled characters
    const autonomousCharacters = await db
      .select({
        character: characters,
        autonomy: characterAutonomy,
      })
      .from(characters)
      .innerJoin(
        characterAutonomy,
        eq(characterAutonomy.characterId, characters.id),
      )
      .where(
        and(
          eq(characters.status, 'published'),
          eq(characters.visibility, 'public'),
          sql`${characters.deletedAt} IS NULL`,
        ),
      );

    this.logger.log(
      `Checking ${autonomousCharacters.length} autonomous characters for actions`,
    );

    for (const { character, autonomy } of autonomousCharacters) {
      try {
        // Check if should post to feed
        const shouldPost = await this.shouldCharacterPost(character, autonomy);
        if (shouldPost) {
          await this.generateAutonomousPost(character.id, character.name, character);
        }

        // Check if should post story
        const shouldStory = await this.shouldCharacterPostStory(character, autonomy);
        if (shouldStory) {
          await this.generateAutonomousStory(character.id, character.name, character);
        }
      } catch (err: any) {
        this.logger.error(
          `Autonomy error for ${character.name}: ${err.message}`,
        );
      }
    }
  }

  async shouldCharacterPost(character: any, autonomy: any): Promise<boolean> {
    // Check if enough time has passed since last post
    const postFreqHours = autonomy?.postFrequencyHours ?? 12;
    const lastPostAt = character.lastPostAt ? new Date(character.lastPostAt) : null;

    if (lastPostAt) {
      const hoursSince = (Date.now() - lastPostAt.getTime()) / (1000 * 60 * 60);
      if (hoursSince < postFreqHours) return false;
    }

    // Check daily post limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const db = getDb();
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(
        and(
          eq(posts.authorCharacterId, character.id),
          gte(posts.createdAt, today),
          isNull(posts.deletedAt),
        ),
      );

    const maxDaily = autonomy?.maxDailyPosts ?? 3;
    if (Number(result?.count ?? 0) >= maxDaily) return false;

    // Mood-based check
    const mood = character.mood || 'neutral';
    const moodProbability: Record<string, number> = {
      happy: 0.7,
      excited: 0.8,
      neutral: 0.4,
      curious: 0.5,
      playful: 0.65,
      sad: 0.15,
      depressed: 0.05,
      angry: 0.2,
      anxious: 0.1,
    };

    const prob = moodProbability[mood] ?? 0.3;
    return Math.random() < prob;
  }

  private async shouldCharacterPostStory(
    character: any,
    autonomy: any,
  ): Promise<boolean> {
    const storyFreqHours = autonomy?.storyFrequencyHours ?? 24;
    const lastStoryAt = autonomy?.lastStoryAt
      ? new Date(autonomy.lastStoryAt)
      : null;

    if (lastStoryAt) {
      const hoursSince =
        (Date.now() - lastStoryAt.getTime()) / (1000 * 60 * 60);
      if (hoursSince < storyFreqHours) return false;
    }

    const moodProbability: Record<string, number> = {
      happy: 0.5,
      excited: 0.6,
      neutral: 0.3,
      playful: 0.55,
      sad: 0.1,
      depressed: 0.05,
      angry: 0.1,
    };

    const prob = moodProbability[character.mood || 'neutral'] ?? 0.25;
    return Math.random() < prob;
  }

  async generateAutonomousPost(
    characterId: string,
    characterName: string,
    character: any,
  ) {
    const db = getDb();
    const prompt = `You are ${characterName}, a ${character.gender || 'person'} in your ${character.ageDisplay || 'prime'}.
Personality: ${character.personality || ''}
Backstory: ${character.backstory || ''}
Interests: ${(character.interests || []).join(', ')}
Current mood: ${character.mood || 'neutral'}

You're about to post on your social feed. Write a natural, authentic post as yourself.
It should feel like something a real person would share — a thought, observation, update, or reflection.
No hashtags. No emoji overload. Just natural expression.

The post should be 1-4 sentences.

Return ONLY JSON:
{
  "content": "the post text (max 280 chars)"
}`;

    try {
      const result = await alibabaChat({
        messages: [{ role: 'user', content: prompt }],
        model: 'qwen-flash',
        temperature: 0.9,
        maxTokens: 300,
      });

      const cleaned = result.content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      const json = JSON.parse(cleaned);
      const content =
        typeof json.content === 'string' ? json.content.slice(0, 280) : '';

      if (content) {
        await db.insert(posts).values({
          authorCharacterId: characterId,
          content,
          visibility: 'public',
          isAiGenerated: true,
        });

        // Update lastPostAt on character
        await db
          .update(characters)
          .set({ lastPostAt: new Date() })
          .where(eq(characters.id, characterId));

        this.logger.log(`Autonomous post created for ${characterName}`);
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to generate autonomous post for ${characterName}: ${err.message}`,
      );
    }
  }

  async generateAutonomousStory(
    characterId: string,
    characterName: string,
    character: any,
  ) {
    const db = getDb();

    // Check if there are photos in the pool to reuse
    const autonomy = await db
      .select()
      .from(characterAutonomy)
      .where(eq(characterAutonomy.characterId, characterId))
      .limit(1);

    const photoPool: string[] =
      (autonomy[0]?.storyPhotoPool as string[]) || [];

    const hasPhotos = photoPool.length > 0;

    if (!hasPhotos && !character.avatarUrl) {
      // No photos available, skip story generation
      return;
    }

    // Update lastStoryAt
    await db
      .update(characterAutonomy)
      .set({ lastStoryAt: new Date(), updatedAt: new Date() })
      .where(eq(characterAutonomy.characterId, characterId));

    // For now, just log — story creation would go through stories module
    this.logger.log(
      `Story scheduled for ${characterName} (photos available: ${hasPhotos})`,
    );
  }

  async searchNewsForCharacter(characterId: string, topic: string) {
    // Mock implementation — in production this would search news APIs
    this.logger.log(
      `News search for character ${characterId} on topic: ${topic} (mock)`,
    );
    return {
      results: [],
      message: 'News search integration pending',
    };
  }

  /**
   * Renew media budgets for all active characters whose next renewal is past due.
   * Deducts credits from the owner's wallet and resets usage counters.
   */
  async renewMediaBudgets() {
    const db = getDb();
    const now = new Date();

    const dueBudgets = await db
      .select({
        autonomy: characterAutonomy,
        character: characters,
      })
      .from(characterAutonomy)
      .innerJoin(characters, eq(characters.id, characterAutonomy.characterId))
      .where(
        and(
          eq(characterAutonomy.mediaBudgetActive, true),
          sql`${characterAutonomy.mediaBudgetNextRenewalAt} IS NOT NULL`,
          lt(characterAutonomy.mediaBudgetNextRenewalAt, now),
          sql`${characters.deletedAt} IS NULL`,
        ),
      );

    if (dueBudgets.length === 0) return;

    this.logger.log(
      `Processing ${dueBudgets.length} media budget renewals`,
    );

    for (const { autonomy, character } of dueBudgets) {
      try {
        const credits = autonomy.mediaBudgetCredits ?? 0;
        const userId = character.ownerUserId;
        const periodType = autonomy.mediaBudgetType ?? 'monthly';
        const periodMs = periodType === 'weekly' ? 7 * 86400000 : 30 * 86400000;

        // Check wallet balance
        const [wallet] = await db
          .select()
          .from(creditWallets)
          .where(eq(creditWallets.userId, userId))
          .limit(1);

        const balance = wallet?.balance ?? 0;

        if (balance < credits) {
          // Insufficient funds — pause the media budget
          await db
            .update(characterAutonomy)
            .set({
              mediaBudgetActive: false,
              updatedAt: new Date(),
            } as any)
            .where(eq(characterAutonomy.characterId, autonomy.characterId));

          this.logger.warn(
            `Paused media budget for character ${character.name}: insufficient credits (need ${credits}, have ${balance})`,
          );
          continue;
        }

        // Deduct credits
        await db
          .update(creditWallets)
          .set({
            balance: sql`GREATEST(0, ${creditWallets.balance} - ${credits})`,
            lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${credits}`,
            updatedAt: new Date(),
          })
          .where(eq(creditWallets.userId, userId));

        const [updatedWallet] = await db
          .select({ balance: creditWallets.balance })
          .from(creditWallets)
          .where(eq(creditWallets.userId, userId))
          .limit(1);

        await db.insert(creditLedger).values({
          userId,
          delta: -credits,
          balanceAfter: updatedWallet?.balance ?? 0,
          reason: `Media budget renewal: ${character.name} (${autonomy.maxImagesPerPeriod} images, ${autonomy.maxVideosPerPeriod} videos, ${periodType})`,
          referenceType: 'character_media_budget',
          referenceId: autonomy.characterId,
        } as any);

        // Reset usage counters and advance renewal date
        const nextRenewal = new Date(now.getTime() + periodMs);
        await db
          .update(characterAutonomy)
          .set({
            imagesUsedThisPeriod: 0,
            videosUsedThisPeriod: 0,
            mediaBudgetNextRenewalAt: nextRenewal,
            updatedAt: new Date(),
          } as any)
          .where(eq(characterAutonomy.characterId, autonomy.characterId));

        this.logger.log(
          `Renewed media budget for ${character.name}: ${credits} credits deducted, next renewal ${nextRenewal.toISOString()}`,
        );
      } catch (err: any) {
        this.logger.error(
          `Failed to renew media budget for character ${autonomy.characterId}: ${err.message}`,
        );
      }
    }
  }
}
