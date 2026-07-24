import { pgTable, uuid, text, timestamp, jsonb, integer, index, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';
import { characters } from './characters';

export const storyStatusEnum = pgEnum('story_status', ['draft', 'scheduled', 'generating', 'published', 'expired', 'failed', 'removed']);

export const stories = pgTable('stories', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'cascade' }),
  authorCharacterId: uuid('author_character_id').references(() => characters.id, { onDelete: 'cascade' }),
  status: storyStatusEnum('status').notNull().default('draft'),
  mediaAssetId: uuid('media_asset_id'),
  caption: text('caption'),
  storyType: text('story_type').notNull(),
  generated: text('generated').notNull().default('false'),
  generationJobId: uuid('generation_job_id'),
  moderationStatus: text('moderation_status').notNull().default('pending'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  metadata: jsonb('metadata').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  feedIdx: index('idx_stories_public_feed').on(table.status, table.publishedAt?.desc(), table.expiresAt),
  charIdx: index('idx_stories_character').on(table.authorCharacterId, table.publishedAt?.desc()),
}));

export const storyViews = pgTable('story_views', {
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  viewerUserId: uuid('viewer_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  viewedAt: timestamp('viewed_at', { withTimezone: true }).notNull().defaultNow(),
});
