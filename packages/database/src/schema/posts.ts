import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
  pgEnum,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { characters } from './characters';

export const postVisibilityEnum = pgEnum('post_visibility', ['public', 'friends', 'private']);
export const postReactionTypeEnum = pgEnum('post_reaction_type', [
  'like', 'love', 'haha', 'wow', 'sad', 'angry', 'care',
]);

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'cascade' }),
  authorCharacterId: uuid('author_character_id').references(() => characters.id, { onDelete: 'cascade' }),
  content: text('content'),
  mediaUrl: text('media_url'),
  mediaType: text('media_type'),
  thumbnailUrl: text('thumbnail_url'),
  visibility: postVisibilityEnum('visibility').notNull().default('public'),
  nsfw: boolean('nsfw').notNull().default(false),
  likeCount: integer('like_count').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  shareCount: integer('share_count').notNull().default(0),
  viewCount: integer('view_count').notNull().default(0),
  isAiGenerated: boolean('is_ai_generated').notNull().default(false),
  sourceNewsUrl: text('source_news_url'),
  sourceNewsTitle: text('source_news_title'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  authorUserIdx: index('idx_posts_author_user').on(table.authorUserId, table.createdAt.desc()),
  authorCharacterIdx: index('idx_posts_author_character').on(table.authorCharacterId, table.createdAt.desc()),
  visibilityIdx: index('idx_posts_visibility').on(table.visibility, table.createdAt.desc()),
}));

export const postReactions = pgTable('post_reactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  characterId: uuid('character_id').references(() => characters.id, { onDelete: 'cascade' }),
  reactionType: postReactionTypeEnum('reaction_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userReactionUnique: uniqueIndex('post_reactions_post_user_unique').on(table.postId, table.userId),
  characterReactionUnique: uniqueIndex('post_reactions_post_character_unique').on(table.postId, table.characterId),
}));

export const postComments = pgTable('post_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
  parentCommentId: uuid('parent_comment_id'),
  content: text('content').notNull(),
  isAiGenerated: boolean('is_ai_generated').notNull().default(false),
  likeCount: integer('like_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
