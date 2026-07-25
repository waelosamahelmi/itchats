import { Injectable, Logger, Inject } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { stories, characters, characterLocations, creditWallets, usageEvents } from '@itchats/database/schema';
import { eq, and, lt, sql } from 'drizzle-orm';
import { BillingService } from '../billing/billing.service';
import { getCreditCost } from '@itchats/ai-core/costing';
import { alibabaChat, alibabaTextToImageWithFallback } from '@itchats/ai-core';

@Injectable()
export class StorySchedulerService {
  private readonly logger = new Logger(StorySchedulerService.name);
  private interval: NodeJS.Timeout | null = null;

  constructor(@Inject(BillingService) private readonly billingService: BillingService) {}

  start() {
    this.logger.log('Story scheduler started (every 15 minutes)');
    this.interval = setInterval(() => this.tick(), 15 * 60 * 1000);
    this.tick();
  }

  stop() { if (this.interval) clearInterval(this.interval); }

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

        // Generate AI story based on character personality
        const storyPrompt = `You are ${char.name}. ${char.personality || ''} ${char.backstory ? `Backstory: ${char.backstory.substring(0, 300)}` : ''}
Write a short social media story (2-3 sentences, max 200 chars) in first person as this character. Make it authentic to their personality. Include 1-2 relevant emojis. Be casual and natural — like an Instagram story.`;

        const storyResult = await alibabaChat({
          messages: [{ role: 'user', content: storyPrompt }],
          model: 'qwen3.5-flash',
          temperature: 1.0,
          maxTokens: 200,
        });

        const caption = storyResult.content.trim().substring(0, 300);

        // 30% chance of image story
        const makeImage = Math.random() < 0.3;
        let mediaUrl = '';
        let mediaType = '';
        let storyType = 'text';

        if (makeImage) {
          try {
            const imagePrompt = `Social media story image for ${char.name}: ${char.description?.substring(0, 200) || caption}. Cinematic, aesthetic, vertical 9:16 aspect ratio`;
            const imgResult = await alibabaTextToImageWithFallback({ prompt: imagePrompt, size: '1024*1024' });
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
          expiresAt: new Date(Date.now() + 24 * 3600000),
        } as any).returning();

        await this.billingService.debitWallet(char.ownerUserId, storyCost, 'auto-story', 'story', story!.id);

        this.logger.log(`AI story created for ${char.name}: "${caption.substring(0, 60)}..." ${mediaUrl ? '[image]' : '[text]'}`);
      } catch (err: any) {
        this.logger.error(`Story scheduler error for ${char.name}: ${err.message}`);
      }
    }
  }
}
