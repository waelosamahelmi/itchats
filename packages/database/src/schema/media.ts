import { pgTable, uuid, text, timestamp, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

export const mediaVisibilityEnum = pgEnum('media_visibility', ['private', 'public']);

export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerUserId: uuid('owner_user_id').references(() => users.id, { onDelete: 'set null' }),
  url: text('url').notNull().default(''),
  visibility: mediaVisibilityEnum('visibility').notNull(),
  storageProvider: text('storage_provider').notNull(),
  bucket: text('bucket').notNull(),
  objectKey: text('object_key').notNull(),
  mimeType: text('mime_type').notNull(),
  mediaType: text('media_type').notNull(),
  width: integer('width'),
  height: integer('height'),
  durationMs: integer('duration_ms'),
  bytes: integer('bytes'),
  sha256: text('sha256'),
  moderationStatus: text('moderation_status').notNull().default('pending'),
  metadata: jsonb('metadata').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
