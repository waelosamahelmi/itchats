import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { posts } from './posts';

export const hashtags = pgTable('hashtags', {
  id: uuid('id').primaryKey().defaultRandom(),
  normalizedName: text('normalized_name').notNull().unique(),
  displayName: text('display_name').notNull(),
  usageCount: integer('usage_count').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const postHashtags = pgTable('post_hashtags', {
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  hashtagId: uuid('hashtag_id').notNull().references(() => hashtags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.postId, table.hashtagId] }),
  postIdx: index('idx_post_hashtags_post').on(table.postId),
  hashtagIdx: index('idx_post_hashtags_hashtag').on(table.hashtagId),
}));
