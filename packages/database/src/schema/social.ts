import { pgTable, uuid, text, timestamp, index, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';
import { characters } from './characters';

export const characterFollows = pgTable('character_follows', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const contentLikes = pgTable('content_likes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  parentCommentId: uuid('parent_comment_id'),
  content: text('content').notNull(),
  moderationStatus: text('moderation_status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const userBlocks = pgTable('user_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  blockerUserId: uuid('blocker_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  blockedUserId: uuid('blocked_user_id').references(() => users.id, { onDelete: 'cascade' }),
  blockedCharacterId: uuid('blocked_character_id').references(() => characters.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  reporterUserId: uuid('reporter_user_id').references(() => users.id, { onDelete: 'set null' }),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  reason: text('reason').notNull(),
  detail: text('detail'),
  status: text('status').notNull().default('open'),
  assignedAdminUserId: uuid('assigned_admin_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
}, (table) => ({
  statusIdx: index('idx_reports_status_created').on(table.status, table.createdAt),
}));

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  data: jsonb('data').notNull().default({}),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  unreadIdx: index('idx_notifications_user_unread').on(table.userId, table.readAt, table.createdAt.desc()),
}));
