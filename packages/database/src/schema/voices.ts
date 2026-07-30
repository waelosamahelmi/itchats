import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const voiceGenderEnum = pgEnum('voice_gender', ['male', 'female']);

export const preGeneratedVoices = pgTable('pre_generated_voices', {
  id: uuid('id').primaryKey().defaultRandom(),
  voiceKey: text('voice_key').notNull().unique(),
  label: text('label').notNull(),
  gender: voiceGenderEnum('gender').notNull(),
  style: text('style').notNull(),
  description: text('description').notNull(),
  audioUrl: text('audio_url'),
  sampleText: text('sample_text'),
  duration: integer('duration'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
