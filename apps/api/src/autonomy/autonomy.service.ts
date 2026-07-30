import { Injectable, Logger } from '@nestjs/common';
import { getDb } from '@itchats/database';
import {
  characters,
  characterAutonomy,
  posts,
  postReactions,
  postComments,
  characterRelationships,
  creditWallets,
  creditLedger,
} from '@itchats/database/schema';
import { eq, and, sql, isNull, lt, gte, ne } from 'drizzle-orm';
import { alibabaChat } from '@itchats/ai-core';
import { TrendSearchService } from './trend-search.service';
import { ImageSearchService } from './image-search.service';

// Helper: generate a random timestamp between minHours ago and maxHours ago
function randomPastTime(minHours: number, maxHours: number): Date {
  const ms = (minHours + Math.random() * (maxHours - minHours)) * 60 * 60 * 1000;
  return new Date(Date.now() - ms);
}

@Injectable()
export class AutonomyService {
  private readonly logger = new Logger(AutonomyService.name);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly trendSearch: TrendSearchService,
    private readonly imageSearch: ImageSearchService,
  ) {}

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

        // Check if should search trends and post news reaction
        const shouldSearchTrends = await this.shouldSearchTrends(character, autonomy);
        if (shouldSearchTrends) {
          await this.searchTrendsAndPost(character.id, character.name, character);
        }

        // Check if should repost from another character
        const shouldRepost = await this.shouldRepost(character);
        if (shouldRepost) {
          await this.findAndRepostContent(character.id, character);
        }

        // Check if should interact with other characters (like/comment on their posts)
        const shouldInteract = await this.shouldInteractWithPeers(character);
        if (shouldInteract) {
          await this.interactWithPeerPosts(character);
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
        // Always search for a relevant image
        const interests: string[] = Array.isArray(character.interests) ? character.interests : [];
        const searchTerm: string = interests.length > 0
          ? (interests[Math.floor(Math.random() * interests.length)] ?? characterName ?? 'social')
          : (characterName ?? 'social');
        const mediaUrl = await this.imageSearch.searchImage(searchTerm);

        // Random published time: 1-24 hours ago
        const publishedAt = randomPastTime(1, 24);

        await db.insert(posts).values({
          authorCharacterId: characterId,
          content,
          mediaUrl: mediaUrl ?? undefined,
          mediaType: mediaUrl ? 'image' : undefined,
          visibility: 'public',
          isAiGenerated: true,
          createdAt: publishedAt,
          updatedAt: publishedAt,
        });

        // Update lastPostAt on character
        await db
          .update(characters)
          .set({ lastPostAt: new Date() })
          .where(eq(characters.id, characterId));

        this.logger.log(`Autonomous post created for ${characterName}${mediaUrl ? ' with image' : ' (no image found)'}`);
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

  /**
   * Determine if the character should search for trends and post about them.
   */
  private async shouldSearchTrends(
    character: any,
    autonomy: any,
  ): Promise<boolean> {
    if (!autonomy?.canSearchNews) return false;

    // Check time since last news search
    const lastSearchAt = autonomy?.lastNewsSearchAt
      ? new Date(autonomy.lastNewsSearchAt)
      : null;

    if (lastSearchAt) {
      const hoursSince =
        (Date.now() - lastSearchAt.getTime()) / (1000 * 60 * 60);
      // Don't search more than once every 6 hours by default
      if (hoursSince < 6) return false;
    }

    // Random chance — not every character should post about news every cycle
    return Math.random() < 0.3;
  }

  /**
   * Determine if the character should repost another character's content.
   */
  private async shouldRepost(character: any): Promise<boolean> {
    if (!character.interests || (character.interests as any[]).length === 0) {
      return false;
    }

    // Extrovert characters repost more often
    const personality = (character.personality || '').toLowerCase();
    const isExtrovert =
      personality.includes('extrovert') ||
      personality.includes('outgoing') ||
      personality.includes('social') ||
      personality.includes('friendly') ||
      personality.includes('gregarious');

    const isIntrovert =
      personality.includes('introvert') ||
      personality.includes('shy') ||
      personality.includes('private') ||
      personality.includes('quiet');

    // Base probability
    let baseProb = isExtrovert ? 0.3 : isIntrovert ? 0.05 : 0.15;

    // If they haven't posted in a while, more likely to repost
    const lastPostAt = character.lastPostAt
      ? new Date(character.lastPostAt)
      : null;
    if (lastPostAt) {
      const hoursSince =
        (Date.now() - lastPostAt.getTime()) / (1000 * 60 * 60);
      if (hoursSince > 24) baseProb += 0.2;
      if (hoursSince > 48) baseProb += 0.15;
    } else {
      baseProb += 0.2; // Never posted yet, eager to engage
    }

    // Happy/excited moods increase repost chance
    const happyMoods = ['happy', 'excited', 'playful', 'loving'];
    if (happyMoods.includes(character.mood || '')) baseProb += 0.1;

    return Math.random() < Math.min(baseProb, 0.6);
  }

  /**
   * Search trends for the character and create a feed post reacting to news.
   */
  async searchTrendsAndPost(
    characterId: string,
    characterName: string,
    character: any,
  ) {
    const db = getDb();
    const interests: string[] =
      Array.isArray(character.interests) ? character.interests : [];
    const newsInterests = Array.isArray(character.autonomy_config?.newsInterests)
      ? character.autonomy_config.newsInterests
      : [];

    // Merge interests and newsInterests for topic selection
    const allTopics = [...new Set([...interests, ...newsInterests])];

    if (allTopics.length === 0) {
      this.logger.debug(
        `${characterName} has no interests — skipping trend search`,
      );
      return;
    }

    try {
      const result = await this.trendSearch.searchTrendsForCharacter(
        characterName,
        character.personality || '',
        allTopics,
        character.mood || 'neutral',
      );

      if (result.characterReaction) {
        const topStory = result.newsResults[0];

        // Get image: prefer trend service's found image, else search
        let imageUrl = result.selectedImageUrl;
        if (!imageUrl) {
          const topic = allTopics[Math.floor(Math.random() * allTopics.length)] ?? characterName ?? 'news';
          imageUrl = await this.imageSearch.searchImage(topic);
        }

        // Random published time: 2-48 hours ago (trend posts can be spread further)
        const publishedAt = randomPastTime(2, 48);

        await db.insert(posts).values({
          authorCharacterId: characterId,
          content: result.characterReaction,
          mediaUrl: imageUrl ?? undefined,
          mediaType: imageUrl ? 'image' : undefined,
          visibility: 'public',
          isAiGenerated: true,
          sourceNewsUrl: topStory?.url ?? undefined,
          sourceNewsTitle: topStory?.title ?? undefined,
          createdAt: publishedAt,
          updatedAt: publishedAt,
        });

        // Update lastPostAt on character
        await db
          .update(characters)
          .set({ lastPostAt: new Date() })
          .where(eq(characters.id, characterId));

        // Update lastNewsSearchAt on autonomy
        await db
          .update(characterAutonomy)
          .set({ lastNewsSearchAt: new Date(), updatedAt: new Date() })
          .where(eq(characterAutonomy.characterId, characterId));

        this.logger.log(
          `Trend post created for ${characterName} about "${allTopics[0]}"${result.usedFallback ? ' (simulated trends)' : ''}`,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `Trend search failed for ${characterName}: ${err.message}`,
      );
    }
  }

  /**
   * Find content from other characters that this character might want to repost.
   * Uses LLM to decide if the character would repost and with what commentary.
   */
  async findAndRepostContent(characterId: string, character: any) {
    const db = getDb();

    const charInterests: string[] = Array.isArray(character.interests)
      ? character.interests
      : [];

    if (charInterests.length === 0) {
      this.logger.debug(
        `${character.name} has no interests — skipping repost`,
      );
      return;
    }

    try {
      // Find recent posts from OTHER characters that this character hasn't already reposted
      const recentPosts = await db
        .select({
          post: posts,
          authorCharacter: {
            id: characters.id,
            name: characters.name,
            personality: characters.personality,
            mood: characters.mood,
          },
        })
        .from(posts)
        .innerJoin(characters, eq(posts.authorCharacterId, characters.id))
        .where(
          and(
            ne(posts.authorCharacterId, characterId),
            sql`${posts.content} IS NOT NULL`,
            sql`${posts.content} != ''`,
            isNull(posts.deletedAt),
            eq(characters.status, 'published'),
            eq(characters.visibility, 'public'),
          ),
        )
        .orderBy(sql`${posts.createdAt} DESC`)
        .limit(20);

      if (recentPosts.length === 0) {
        this.logger.debug(
          `${character.name}: no recent posts from other characters to repost`,
        );
        return;
      }

      // Score each post for interest match
      const scoredPosts = recentPosts.map(({ post, authorCharacter }) => {
        const postText = ((post.content ?? '') as string).toLowerCase();
        let matchScore = 0;

        for (const interest of charInterests) {
          if (postText.includes((interest as string).toLowerCase())) {
            matchScore += 1;
          }
        }

        return { post, authorCharacter, matchScore };
      });

      // Sort by match score descending
      scoredPosts.sort((a, b) => b.matchScore - a.matchScore);

      // Pick at most top candidates (with some randomness for variety)
      const candidates = scoredPosts.slice(
        0,
        Math.min(5, scoredPosts.length),
      );
      if (candidates.length === 0) return;

      // Use LLM to decide which post to repost and with what commentary
      const candidatePick = candidates[Math.floor(Math.random() * candidates.length)];
      if (!candidatePick) return;

      const prompt = `You are ${character.name}. ${character.personality || ''}
Your interests: ${charInterests.join(', ')}
Your current mood: ${character.mood || 'neutral'}

You're scrolling your social feed and see this post from ${candidatePick.authorCharacter.name}:
"${candidatePick.post.content}"

Decide whether you would repost (share/quote) this. Consider:
- Do you actually care about this topic?
- Does it match your interests or vibe?
- Would sharing this add to YOUR online presence?
- Are you the type of person who shares others' posts?

If you would repost, write the commentary you'd add on top (like a quote-tweet style repost). Your commentary should sound like you — same voice, same style.

Return ONLY a JSON object (no markdown, no code fences):
{
  "shouldRepost": true/false,
  "commentary": "your commentary if reposting (max 200 chars)" | null,
  "reason": "brief reason for your decision"
}`;

      const result = await alibabaChat({
        messages: [{ role: 'user', content: prompt }],
        model: 'qwen-flash',
        temperature: 0.9,
        maxTokens: 400,
      });

      const cleaned = result.content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      const decision = JSON.parse(cleaned);

      if (decision.shouldRepost && decision.commentary) {
        const commentary =
          typeof decision.commentary === 'string'
            ? decision.commentary.slice(0, 280)
            : '';

        // Search for a relevant image
        const searchTerm: string = charInterests.length > 0
          ? (charInterests[Math.floor(Math.random() * charInterests.length)] ?? character.name ?? 'social')
          : (character.name ?? 'social');
        const imageUrl = await this.imageSearch.searchImage(searchTerm);

        // Random published time: 1-12 hours ago
        const publishedAt = randomPastTime(1, 12);

        // Create a repost — a new post with the character's commentary
        // and a reference to the original post
        await db.insert(posts).values({
          authorCharacterId: characterId,
          content: commentary,
          repostOfPostId: candidatePick.post.id,
          mediaUrl: imageUrl ?? undefined,
          mediaType: imageUrl ? 'image' : undefined,
          visibility: 'public',
          isAiGenerated: true,
          createdAt: publishedAt,
          updatedAt: publishedAt,
        });

        // Update lastPostAt on character
        await db
          .update(characters)
          .set({ lastPostAt: new Date() })
          .where(eq(characters.id, characterId));

        this.logger.log(
          `${character.name} reposted from ${candidatePick.authorCharacter.name}: "${commentary.slice(0, 60)}..."`,
        );
      } else {
        this.logger.debug(
          `${character.name} decided not to repost: ${decision.reason || 'no reason given'}`,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `Repost decision failed for ${character.name}: ${err.message}`,
      );
    }
  }

  async searchNewsForCharacter(characterId: string, topic: string) {
    const db = getDb();
    const [character] = await db
      .select()
      .from(characters)
      .where(eq(characters.id, characterId))
      .limit(1);

    if (!character) {
      return { results: [], message: 'Character not found' };
    }

    return this.trendSearch.searchTrendsForCharacter(
      character.name,
      character.personality || '',
      [topic],
      character.mood || 'neutral',
    );
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

  /**
   * Determine if a character should interact with their peers' posts.
   */
  private async shouldInteractWithPeers(character: any): Promise<boolean> {
    const personality = (character.personality || '').toLowerCase();
    // Social characters interact more
    const isSocial =
      personality.includes('social') ||
      personality.includes('friendly') ||
      personality.includes('warm') ||
      personality.includes('outgoing') ||
      personality.includes('extrovert');

    const isQuiet =
      personality.includes('introvert') ||
      personality.includes('shy') ||
      personality.includes('private') ||
      personality.includes('quiet');

    let baseProb = isSocial ? 0.6 : isQuiet ? 0.15 : 0.35;

    // Mood modifier
    const happyMoods = ['happy', 'excited', 'playful', 'curious'];
    if (happyMoods.includes(character.mood || '')) baseProb += 0.15;

    return Math.random() < baseProb;
  }

  /**
   * A character interacts with other characters' posts (like/react + possibly comment).
   */
  private async interactWithPeerPosts(character: any) {
    const db = getDb();
    const charInterests: string[] = Array.isArray(character.interests)
      ? character.interests
      : [];

    try {
      // Find recent posts from other characters that this character hasn't interacted with
      const otherPosts = await db
        .select({
          post: posts,
          author: {
            id: characters.id,
            name: characters.name,
          },
        })
        .from(posts)
        .innerJoin(characters, eq(posts.authorCharacterId, characters.id))
        .where(
          and(
            ne(posts.authorCharacterId, character.id),
            sql`${posts.content} IS NOT NULL`,
            sql`${posts.content} != ''`,
            isNull(posts.deletedAt),
            eq(characters.status, 'published'),
          ),
        )
        .orderBy(sql`${posts.createdAt} DESC`)
        .limit(15);

      if (otherPosts.length === 0) return;

      // Filter to posts this character hasn't already reacted to
      const interactedPostIds = new Set<string>();
      const existingReactions = await db
        .select({ postId: postReactions.postId })
        .from(postReactions)
        .where(eq(postReactions.characterId, character.id));

      for (const r of existingReactions) {
        interactedPostIds.add(r.postId);
      }

      const newPosts = otherPosts.filter(p => !interactedPostIds.has(p.post.id));
      if (newPosts.length === 0) return;

      // Interact with 1-3 posts
      const count = Math.min(1 + Math.floor(Math.random() * 3), newPosts.length);
      const selected = newPosts.sort(() => Math.random() - 0.5).slice(0, count);

      const reactionTypes = ['like', 'love', 'haha', 'wow', 'care'];
      const commentTexts = [
        'Love this! 🔥',
        'So true!',
        'This is great!',
        '😂 facts',
        'Couldn\'t agree more',
        'Amazing! ✨',
        'Such a vibe',
        'This made me smile',
        'Big fan of this',
        'Keep posting! ❤️',
      ];

      for (const { post, author } of selected) {
        try {
          const reactionType = reactionTypes[Math.floor(Math.random() * reactionTypes.length)];

          await db
            .insert(postReactions)
            .values({
              postId: post.id,
              characterId: character.id,
              reactionType: reactionType as any,
            })
            .onConflictDoUpdate({
              target: [postReactions.postId, postReactions.characterId],
              set: { reactionType: reactionType as any },
            });

          // Maybe add a comment too (30% chance)
          if (Math.random() < 0.3) {
            const comment = commentTexts[Math.floor(Math.random() * commentTexts.length)]!;
            await db.insert(postComments).values({
              postId: post.id,
              characterId: character.id,
              content: comment,
              isAiGenerated: true,
            });
          }

          // Update like/comment counts on the interacted post
          const [lResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(postReactions)
            .where(eq(postReactions.postId, post.id));
          const [cResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(postComments)
            .where(and(eq(postComments.postId, post.id), isNull(postComments.deletedAt)));

          await db
            .update(posts)
            .set({
              likeCount: Number(lResult?.count ?? 0),
              commentCount: Number(cResult?.count ?? 0),
            })
            .where(eq(posts.id, post.id));

          this.logger.log(
            `${character.name} reacted to ${author.name}'s post: ${reactionType}`,
          );
        } catch (err: any) {
          this.logger.error(
            `Failed to save interaction from ${character.name} to post ${post.id}: ${err.message}`,
          );
        }
      }
    } catch (err: any) {
      this.logger.error(
        `Peer interaction failed for ${character.name}: ${err.message}`,
      );
    }
  }
}
