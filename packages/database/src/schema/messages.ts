import { pgTable, uuid, text, timestamp, index, pgEnum, jsonb, integer } from 'drizzle-orm/pg-core';
import { conversations } from './conversations';
import { users } from './users';
import { characters } from './characters';

export const messageSenderTypeEnum = pgEnum('message_sender_type', ['user', 'character', 'system']);
export const messageTypeEnum = pgEnum('message_type', ['text', 'image', 'video', 'audio', 'voice_note', 'system']);

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderType: messageSenderTypeEnum('sender_type').notNull(),
  senderUserId: uuid('sender_user_id').references(() => users.id, { onDelete: 'set null' }),
  senderCharacterId: uuid('sender_character_id').references(() => characters.id, { onDelete: 'set null' }),
  type: messageTypeEnum('type').notNull().default('text'),
  content: text('content'),
  replyToMessageId: uuid('reply_to_message_id'),
  replyToId: uuid('reply_to_id'),
  clientIdempotencyKey: text('client_idempotency_key'),
  metadata: jsonb('metadata').notNull().default('{}'),
  mediaAssetId: uuid('media_asset_id'),
  mediaUrl: text('media_url'),
  transcription: text('transcription'),
  durationMs: integer('duration_ms'),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  editedAt: timestamp('edited_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  convCreatedIdx: index('idx_messages_conversation_created').on(table.conversationId, table.createdAt),
}));

export const messageAttachments = pgTable('message_attachments', {
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  mediaAssetId: uuid('media_asset_id').notNull(),
  sortOrder: text('sort_order').notNull().default('0'),
});
