import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  index,
  numeric,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { characters } from './characters';

export const generationTypeEnum = pgEnum('generation_type', [
  'llm_chat', 'character_autofill', 'character_reference', 'text_to_image',
  'image_to_image', 'text_to_video', 'image_to_video', 'reference_to_video',
  'tts', 'asr', 'embedding', 'moderation', 'memory_extract', 'story_plan',
]);
export const generationStatusEnum = pgEnum('generation_status', ['queued', 'processing', 'succeeded', 'failed', 'cancelled']);

export const generationJobs = pgTable('generation_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
  generationType: generationTypeEnum('generation_type').notNull(),
  status: generationStatusEnum('status').notNull().default('queued'),
  routeKey: text('route_key').notNull(),
  modelId: uuid('model_id'),
  providerRequestId: text('provider_request_id'),
  idempotencyKey: text('idempotency_key').notNull(),
  requestJson: jsonb('request_json').notNull(),
  responseJson: jsonb('response_json'),
  errorCode: text('error_code'),
  errorMessageSafe: text('error_message_safe'),
  attemptCount: integer('attempt_count').notNull().default(0),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  statusIdx: index('idx_generation_jobs_status_created').on(table.status, table.createdAt),
}));

export const usageEvents = pgTable('usage_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
  generationJobId: uuid('generation_job_id').references(() => generationJobs.id, { onDelete: 'set null' }),
  providerId: text('provider_id'),
  modelId: uuid('model_id'),
  generationType: generationTypeEnum('generation_type').notNull(),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  inputCharacters: integer('input_characters'),
  audioSeconds: numeric('audio_seconds', { precision: 12, scale: 3 }),
  videoSeconds: numeric('video_seconds', { precision: 12, scale: 3 }),
  imageCount: integer('image_count'),
  providerCostUsd: numeric('provider_cost_usd', { precision: 18, scale: 8 }).notNull().default('0'),
  overheadFactor: numeric('overhead_factor', { precision: 8, scale: 4 }).notNull().default('1'),
  targetMargin: numeric('target_margin', { precision: 8, scale: 4 }).notNull().default('0'),
  calculatedRetailUsd: numeric('calculated_retail_usd', { precision: 18, scale: 8 }).notNull().default('0'),
  creditsDebited: integer('credits_debited').notNull().default(0),
  pricingSnapshot: jsonb('pricing_snapshot').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index('idx_usage_events_user_created').on(table.userId, table.createdAt.desc()),
  modelIdx: index('idx_usage_events_model_created').on(table.modelId, table.createdAt.desc()),
}));
