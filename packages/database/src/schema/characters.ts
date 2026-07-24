import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  pgEnum,
  index,
  boolean,
  numeric,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const characterVisibilityEnum = pgEnum('character_visibility', ['private', 'public', 'unlisted']);
export const characterStatusEnum = pgEnum('character_status', [
  'draft', 'generating_identity', 'ready', 'published', 'suspended', 'disabled', 'deleted',
]);
export const identityOriginEnum = pgEnum('identity_origin', [
  'text_generated', 'private_text_generated', 'private_uploaded_reference',
  'private_image_to_image', 'public_regenerated_from_private_metadata',
]);
export const moderationStatusEnum = pgEnum('moderation_status', ['pending', 'approved', 'flagged', 'rejected']);

export const characters = pgTable('characters', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerUserId: uuid('owner_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  handle: text('handle').unique(),
  visibility: characterVisibilityEnum('visibility').notNull().default('private'),
  status: characterStatusEnum('status').notNull().default('draft'),
  identityOrigin: identityOriginEnum('identity_origin').notNull(),
  identityVersion: integer('identity_version').notNull().default(1),
  avatarMediaId: uuid('avatar_media_id'),
  description: text('description').notNull().default(''),
  personality: text('personality').notNull().default(''),
  backstory: text('backstory').notNull().default(''),
  ageDisplay: text('age_display'),
  gender: text('gender'),
  pronouns: text('pronouns'),
  occupation: text('occupation'),
  interests: jsonb('interests').notNull().default('[]'),
  dislikes: jsonb('dislikes').notNull().default('[]'),
  valuesJson: jsonb('values_json').notNull().default('[]'),
  speakingStyle: text('speaking_style'),
  humorStyle: text('humor_style'),
  languages: jsonb('languages').notNull().default('["en"]'),
  defaultLanguage: text('default_language').notNull().default('en'),
  emotionState: jsonb('emotion_state').notNull().default('{}'),
  autonomyConfig: jsonb('autonomy_config').notNull().default('{}'),
  contentStyle: jsonb('content_style').notNull().default('{}'),
  moderationStatus: moderationStatusEnum('moderation_status').notNull().default('pending'),
  isAiDisclosureRequired: text('is_ai_disclosure_required').notNull().default('true'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  ownerIdx: index('idx_characters_owner').on(table.ownerUserId, table.createdAt.desc()),
  publicIdx: index('idx_characters_public').on(table.status, table.visibility, table.publishedAt?.desc()),
}));

export const characterVersions = pgTable('character_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  canonicalPrompt: text('canonical_prompt').notNull(),
  negativePrompt: text('negative_prompt'),
  structuredIdentity: jsonb('structured_identity').notNull(),
  sourceIdentityOrigin: identityOriginEnum('source_identity_origin').notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const characterVoiceProfiles = pgTable('character_voice_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  providerId: text('provider_id'),
  modelKey: text('model_key'),
  voiceKey: text('voice_key'),
  language: text('language'),
  speed: text('speed').notNull().default('1.0'),
  pitch: text('pitch'),
  style: jsonb('style').notNull().default('{}'),
  previewMediaId: uuid('preview_media_id'),
  active: text('active').notNull().default('true'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const characterLocations = pgTable('character_locations', {
  characterId: uuid('character_id').primaryKey().references(() => characters.id, { onDelete: 'cascade' }),
  city: text('city'),
  region: text('region'),
  countryCode: text('country_code'),
  timezone: text('timezone'),
  publicPointLon: text('public_point_lon'),
  publicPointLat: text('public_point_lat'),
  locationLabel: text('location_label'),
  source: text('source').notNull().default('declared'),
  precisionMeters: integer('precision_meters').notNull().default(5000),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const characterRelationships = pgTable('character_relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  visibleLevel: text('visible_level').notNull().default('1.0'),
  familiarity: text('familiarity').notNull().default('0'),
  trust: text('trust').notNull().default('0'),
  warmth: text('warmth').notNull().default('0'),
  affinity: text('affinity').notNull().default('0'),
  tension: text('tension').notNull().default('0'),
  interactionCount: integer('interaction_count').notNull().default(0),
  lastInteractionAt: timestamp('last_interaction_at', { withTimezone: true }),
  metadata: jsonb('metadata').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const characterReferenceAssets = pgTable('character_reference_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  characterVersionId: uuid('character_version_id').notNull(),
  mediaAssetId: uuid('media_asset_id').notNull(),
  referenceType: text('reference_type').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  generationJobId: uuid('generation_job_id'),
  approved: boolean('approved').notNull().default(false),
  qualityScore: numeric('quality_score', { precision: 6, scale: 4 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
