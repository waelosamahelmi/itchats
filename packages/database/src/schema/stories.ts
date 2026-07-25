import { pgTable, uuid, text, timestamp, jsonb, integer, index, pgEnum } from 'drizzle-orm/pg-core';
import { desc } from 'drizzle-orm';
import { users } from './users';
import { characters } from './characters';

export const storyStatusEnum = pgEnum('story_status', ['draft', 'scheduled', 'generating', 'published', 'expired', 'failed', 'removed']);

export const stories = pgTable('stories', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'cascade' }),
  authorCharacterId: uuid('author_character_id').references(() => characters.id, { onDelete: 'cascade' }),
  characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'set null' }),
  status: storyStatusEnum('status').notNull().default('draft'),
  caption: text('caption'),
  storyType: text('story_type').notNull(),
  mediaUrl: text('media_url'),
  mediaType: text('media_type'),
  thumbnailUrl: text('thumbnail_url'),
  generated: text('generated').notNull().default('false'),
  duration: integer('duration'),
  viewCount: integer('view_count').default(0),
  likeCount: integer('like_count').default(0),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  feedIdx: index('idx_stories_public_feed').on(table.status, desc(table.publishedAt), table.expiresAt),
  charIdx: index('idx_stories_character').on(table.authorCharacterId, desc(table.publishedAt)),
}));

export const storyViews = pgTable('story_views', {
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  viewerUserId: uuid('viewer_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  viewedAt: timestamp('viewed_at', { withTimezone: true }).notNull().defaultNow(),
});
