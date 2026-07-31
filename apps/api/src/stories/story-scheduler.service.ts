import { Injectable, Logger, Inject } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { stories, characters, characterLocations, creditWallets, usageEvents } from '@itchats/database/schema';
import { eq, and, lt, sql } from 'drizzle-orm';
import { BillingService } from '../billing/billing.service';
import { DailyLifeService } from '../daily-life/daily-life.service';
import { getCreditCost } from '@itchats/ai-core/costing';
import { alibabaChat, alibabaTextToImageWithFallback } from '@itchats/ai-core';
import { buildStoryPrompt, buildStoryImagePrompt } from '@itchats/ai-core';

@Injectable()
export class StorySchedulerService {
  private readonly logger = new Logger(StorySchedulerService.name);
  private interval: NodeJS.Timeout | null = null;

  constructor(
    @Inject(BillingService) private readonly billingService: BillingService,
    @Inject(DailyLifeService) private readonly dailyLife: DailyLifeService,
  ) {}

  start() {
    this.logger.log('Story scheduler started (every 15 minutes)');
    this.interval = setInterval(() => void this.runTickSafely(), 15 * 60 * 1000);
    void this.runTickSafely();
  }

  stop() { if (this.interval) clearInterval(this.interval); }

  private async runTickSafely() {
    try {
      await this.tick();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Story scheduler tick failed: ${message}`);
    }
  }

  private async tick() {
    const db = getDb();
    this.logger.log('Scheduler tick: checking for due stories...');

    const eligibleCharacters = await db.select({
      id: characters.id,
      name: characters.name,
      personality: characters.personality,
      backstory: characters.backstory,
      description: characters.description,
      ownerUserId: characters.ownerUserId,
      autonomyConfig: characters.autonomyConfig,
      contentStyle: characters.contentStyle,
      photographyStyle: characters.photographyStyle,
      selfieStyle: characters.selfieStyle,
      cameraStyle: characters.cameraStyle,
    }).from(characters)
      .where(and(
        eq(characters.visibility, 'public'),
        eq(characters.status, 'published'),
        eq(characters.moderationStatus, 'approved'),
        sql`${characters.autonomyConfig}->>'level' IS NOT NULL`,
        sql`(${characters.autonomyConfig}->>'level')::text NOT IN ('off')`,
      ))
      .limit(10);

    for (const char of eligibleCharacters) {
      try {
        // Get current daily-life status
        const status = this.dailyLife.getCurrentStatus(char);
        if (!status.isAwake || status.energyLevel < 3) {
          this.logger.debug(`Skipping story for ${char.name}: ${status.currentActivity} (energy: ${status.energyLevel})`);
          continue;
        }

        const wallet = await db.select().from(creditWallets)
          .where(eq(creditWallets.userId, char.ownerUserId)).limit(1);
        const balance = wallet[0]?.balance ?? 0;
        const storyCost = getCreditCost('qwen3.5-flash', 'llm_chat', { inputTokens: 500, outputTokens: 400 });

        if (balance < storyCost + 5) {
          this.logger.warn(`Skipping story for ${char.name}: insufficient credits`);
          continue;
        }

        const [lastStory] = await db.select().from(stories)
          .where(and(eq(stories.authorCharacterId, char.id), eq(stories.generated, 'true' as any)))
          .orderBy(sql`${stories.publishedAt} DESC NULLS LAST`).limit(1);
        if (lastStory?.publishedAt) {
          const hoursSince = (Date.now() - new Date(lastStory.publishedAt).getTime()) / 3600000;
          if (hoursSince < 48) continue;
        }

        // Generate story using the modular prompt system with daily-life context
        const storyPrompt = buildStoryPrompt({
          characterName: char.name,
          personality: char.personality || '',
          backstory: char.backstory || '',
          description: char.description || '',
          currentActivity: status.currentActivity,
          currentMood: status.currentMood,
          currentLocation: status.currentLocation,
          energyLevel: status.energyLevel,
          photographyStyle: char.photographyStyle || undefined,
          selfieStyle: char.selfieStyle || undefined,
          cameraStyle: char.cameraStyle || undefined,
        });

        const storyResult = await alibabaChat({
          messages: [{ role: 'user', content: storyPrompt }],
          model: 'qwen3.5-flash',
          temperature: 1.0,
          maxTokens: 200,
        });

        const caption = storyResult.content.trim().substring(0, 300);

        // 40% chance of image story (increased from 30%)
        const makeImage = Math.random() < 0.4;
        let mediaUrl = '';
        let mediaType = '';
        let storyType = 'text';

        if (makeImage) {
          try {
            const imagePrompt = buildStoryImagePrompt({
              characterName: char.name,
              personality: char.personality || '',
              backstory: char.backstory || '',
              description: char.description || '',
              currentActivity: status.currentActivity,
              currentMood: status.currentMood,
              currentLocation: status.currentLocation,
              energyLevel: status.energyLevel,
              photographyStyle: char.photographyStyle || undefined,
              selfieStyle: char.selfieStyle || undefined,
              cameraStyle: char.cameraStyle || undefined,
            }, caption);

            const imgResult = await alibabaTextToImageWithFallback({
              prompt: imagePrompt,
              size: '1024*1024',
            });
            mediaUrl = imgResult.url;
            mediaType = 'image/png';
            storyType = 'image';
            await this.billingService.debitWallet(char.ownerUserId, getCreditCost('qwen-image-2.0-pro', 'text_to_image'), 'auto-story-image', 'story', char.id);
          } catch { /* continue without image */ }
        }

        const [story] = await db.insert(stories).values({
          authorCharacterId: char.id,
          characterId: char.id,
          status: 'published',
          storyType,
          caption,
          mediaUrl,
          mediaType,
          generated: 'true' as any,
          publishedAt: new Date(),
          expiresAt: new Date(Date.now() + 72 * 3600000),
        } as any).returning();

        await this.billingService.debitWallet(char.ownerUserId, storyCost, 'auto-story', 'story', story!.id);

        this.logger.log(`Story for ${char.name} (${status.currentActivity}, ${status.currentMood}): "${caption.substring(0, 60)}..." ${mediaUrl ? '[image]' : '[text]'}`);
      } catch (err: any) {
        this.logger.error(`Story scheduler error for ${char.name}: ${err.message}`);
      }
    }
  }
}
