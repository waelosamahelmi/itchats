import { pgTable, uuid, text, timestamp, integer, numeric, index } from 'drizzle-orm/pg-core';
import { characters } from './characters';
import { users } from './users';
import { conversations } from './conversations';

export const characterMemories = pgTable('character_memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  memoryType: text('memory_type').notNull(),
  importance: numeric('importance', { precision: 5, scale: 4 }).notNull().default('0.5'),
  confidence: numeric('confidence', { precision: 5, scale: 4 }).notNull().default('0.5'),
  // embedding: vector('embedding', { dimensions: 1024 }), -- requires pgvector extension
  sourceMessageIds: uuid('source_message_ids').array().notNull().default([]),
  lastRecalledAt: timestamp('last_recalled_at', { withTimezone: true }),
  recallCount: integer('recall_count').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  scopeIdx: index('idx_character_memories_scope').on(table.characterId, table.userId, table.createdAt.desc()),
}));
