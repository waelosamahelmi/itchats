import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { characters } from './characters';

export const conversationTypeEnum = pgEnum('conversation_type', ['human_human', 'human_character', 'group']);
export const conversationModeEnum = pgEnum('conversation_mode', ['chat', 'roleplay']);

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: conversationTypeEnum('type').notNull(),
  createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
  mode: conversationModeEnum('mode').notNull().default('chat'),
  title: text('title'),
  summary: text('summary'),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  characterIdx: index('idx_conversations_character').on(table.characterId, table.lastMessageAt),
}));

export const conversationParticipants = pgTable('conversation_participants', {
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  lastReadMessageId: uuid('last_read_message_id'),
  mutedUntil: timestamp('muted_until', { withTimezone: true }),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});
