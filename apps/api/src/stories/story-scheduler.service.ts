import { Injectable, Logger } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { stories, characters, characterLocations, creditWallets } from '@itchats/database/schema';
import { eq, and, lt, sql } from 'drizzle-orm';
import { BillingService } from '../billing/billing.service';
import { getCreditCost } from '@itchats/ai-core/costing';

@Injectable()
export class StorySchedulerService {
  private readonly logger = new Logger(StorySchedulerService.name);
  private interval: NodeJS.Timeout | null = null;

  constructor(private readonly billingService: BillingService) {}

  start() {
    this.logger.log('Story scheduler started (every 15 minutes)');
    this.interval = setInterval(() => this.tick(), 15 * 60 * 1000);
    this.tick(); // Run immediately
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  private async tick() {
    const db = getDb();
    this.logger.log('Scheduler tick: checking for due stories...');

    // Find published public characters with autonomy enabled
    const eligibleCharacters = await db.select({
      id: characters.id,
      name: characters.name,
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
        // Check wallet
        const wallet = await db.select().from(creditWallets)
          .where(eq(creditWallets.userId, char.ownerUserId)).limit(1);
        const balance = wallet[0]?.balance ?? 0;
        const estimatedCost = getCreditCost('qwen-image-2.0', 'text_to_image');

        if (balance < estimatedCost) {
          this.logger.warn(`Skipping story for ${char.name}: insufficient credits (${balance} < ${estimatedCost})`);
          continue;
        }

        // Check last story time
        const [lastStory] = await db.select().from(stories)
          .where(and(eq(stories.authorCharacterId, char.id), eq(stories.generated, true as any)))
          .orderBy(sql`${stories.publishedAt} DESC NULLS LAST`).limit(1);

        if (lastStory?.publishedAt) {
          const hoursSince = (Date.now() - new Date(lastStory.publishedAt).getTime()) / 3600000;
          if (hoursSince < 48) continue; // Minimum 48h between auto stories
        }

        // Create a simple text story for MVP
        const [story] = await db.insert(stories).values({
          authorCharacterId: char.id,
          status: 'published',
          storyType: 'text',
          caption: `Just checking in! 👋 Thinking about my day...`,
          generated: true,
          publishedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 3600000),
          moderationStatus: 'approved',
        }).returning();

        this.logger.log(`Auto-story created for ${char.name} (${story!.id})`);

        // Debit
        await this.billingService.debitWallet(char.ownerUserId, estimatedCost, 'auto-story', 'story', story!.id);
      } catch (err: any) {
        this.logger.error(`Story scheduler error for ${char.name}: ${err.message}`);
      }
    }
  }
}
