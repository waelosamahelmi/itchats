import {
  pgTable,
  uuid,
  boolean,
  integer,
  jsonb,
  timestamp,
  text,
} from 'drizzle-orm/pg-core';
import { characters } from './characters';

export const characterAutonomy = pgTable('character_autonomy', {
  characterId: uuid('character_id').primaryKey().references(() => characters.id, { onDelete: 'cascade' }),
  canPostStories: boolean('can_post_stories').notNull().default(false),
  canPostFeed: boolean('can_post_feed').notNull().default(false),
  canSearchNews: boolean('can_search_news').notNull().default(false),
  storyFrequencyHours: integer('story_frequency_hours').notNull().default(24),
  postFrequencyHours: integer('post_frequency_hours').notNull().default(12),
  newsInterests: jsonb('news_interests').notNull().default('[]'),
  lastStoryAt: timestamp('last_story_at', { withTimezone: true }),
  lastNewsSearchAt: timestamp('last_news_search_at', { withTimezone: true }),
  storyPhotoPool: jsonb('story_photo_pool').notNull().default('[]'),
  maxDailyPosts: integer('max_daily_posts').notNull().default(3),
  maxDailyStories: integer('max_daily_stories').notNull().default(2),
  // ── Media Budget ──
  mediaBudgetType: text('media_budget_type').notNull().default('monthly'),
  maxImagesPerPeriod: integer('max_images_per_period').notNull().default(0),
  maxVideosPerPeriod: integer('max_videos_per_period').notNull().default(0),
  mediaBudgetCredits: integer('media_budget_credits').notNull().default(0),
  mediaBudgetActive: boolean('media_budget_active').notNull().default(false),
  mediaBudgetStartAt: timestamp('media_budget_start_at', { withTimezone: true }),
  mediaBudgetNextRenewalAt: timestamp('media_budget_next_renewal_at', { withTimezone: true }),
  imagesUsedThisPeriod: integer('images_used_this_period').notNull().default(0),
  videosUsedThisPeriod: integer('videos_used_this_period').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
