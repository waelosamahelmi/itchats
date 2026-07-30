import {
  pgTable,
  uuid,
  boolean,
  integer,
  jsonb,
  timestamp,
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
