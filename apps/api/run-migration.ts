import 'dotenv/config';
import { getPool } from '../../packages/database/src/connection';

const migrations = [
  // Conversation experience
  `DO $$ BEGIN CREATE TYPE "public"."conversation_mode" AS ENUM ('chat', 'roleplay'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS mode conversation_mode NOT NULL DEFAULT 'chat'`,
  `DO $$ BEGIN CREATE TYPE "public"."reaction_actor_type" AS ENUM ('user', 'character'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS message_reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    actor_type reaction_actor_type NOT NULL,
    actor_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    actor_character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT message_reactions_exactly_one_actor CHECK (
      (actor_type = 'user' AND actor_user_id IS NOT NULL AND actor_character_id IS NULL)
      OR (actor_type = 'character' AND actor_character_id IS NOT NULL AND actor_user_id IS NULL)
    )
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS message_reactions_message_user_unique ON message_reactions (message_id, actor_user_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS message_reactions_message_character_unique ON message_reactions (message_id, actor_character_id)`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS avatar_url text`,

  // Character Identity Engine
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS canonical_name text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS identity_lock boolean NOT NULL DEFAULT false`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS nationality text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS ethnicity text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS height text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS body_type text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS skin_tone text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS eye_color text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS hair text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS facial_features text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS tattoos text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS accessories text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS wardrobe text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS photography_style text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS emoji_style text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS energy_level text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS confidence text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS emotional_baseline text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS curiosity text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS optimism text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS affection text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS jealousy text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS ambition text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS intelligence text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS secrets jsonb NOT NULL DEFAULT '[]'`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS goals jsonb NOT NULL DEFAULT '[]'`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS fears jsonb NOT NULL DEFAULT '[]'`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS routines jsonb NOT NULL DEFAULT '[]'`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS sleep_schedule text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS music_taste text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS food_taste text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS camera_style text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS selfie_style text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS story_style text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS voice_model text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS tts_voice text`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS reference_pack_id uuid`,
  `ALTER TABLE characters ADD COLUMN IF NOT EXISTS typing_profile jsonb NOT NULL DEFAULT '{}'`,

  // Reference Assets
  `ALTER TABLE character_reference_assets ADD COLUMN IF NOT EXISTS reference_pack_id uuid`,
  `ALTER TABLE character_reference_assets ADD COLUMN IF NOT EXISTS prompt text`,
  `ALTER TABLE character_reference_assets ADD COLUMN IF NOT EXISTS negative_prompt text`,
  `ALTER TABLE character_reference_assets ADD COLUMN IF NOT EXISTS seed text`,
  `ALTER TABLE character_reference_assets ADD COLUMN IF NOT EXISTS identity_score numeric(6,4)`,

  // Relationship Engine
  `ALTER TABLE character_relationships ADD COLUMN IF NOT EXISTS comfort text NOT NULL DEFAULT '0'`,
  `ALTER TABLE character_relationships ADD COLUMN IF NOT EXISTS attachment text NOT NULL DEFAULT '0'`,
  `ALTER TABLE character_relationships ADD COLUMN IF NOT EXISTS curiosity text NOT NULL DEFAULT '0'`,
  `ALTER TABLE character_relationships ADD COLUMN IF NOT EXISTS respect text NOT NULL DEFAULT '0'`,
  `ALTER TABLE character_relationships ADD COLUMN IF NOT EXISTS chemistry text NOT NULL DEFAULT '0'`,
  `ALTER TABLE character_relationships ADD COLUMN IF NOT EXISTS romance text NOT NULL DEFAULT '0'`,
  `ALTER TABLE character_relationships ADD COLUMN IF NOT EXISTS humor text NOT NULL DEFAULT '0'`,
  `ALTER TABLE character_relationships ADD COLUMN IF NOT EXISTS inside_jokes jsonb NOT NULL DEFAULT '[]'`,
  `ALTER TABLE character_relationships ADD COLUMN IF NOT EXISTS shared_memories jsonb NOT NULL DEFAULT '[]'`,
  `ALTER TABLE character_relationships ADD COLUMN IF NOT EXISTS compatibility text NOT NULL DEFAULT '0'`,
  `ALTER TABLE character_relationships ADD COLUMN IF NOT EXISTS last_conflict timestamp with time zone`,
  `ALTER TABLE character_relationships ADD COLUMN IF NOT EXISTS last_gift timestamp with time zone`,
  `ALTER TABLE character_relationships ADD COLUMN IF NOT EXISTS days_known integer NOT NULL DEFAULT 0`,
  `ALTER TABLE character_relationships ADD COLUMN IF NOT EXISTS conversation_count integer NOT NULL DEFAULT 0`,
  `ALTER TABLE character_relationships ADD COLUMN IF NOT EXISTS image_requests integer NOT NULL DEFAULT 0`,
  `ALTER TABLE character_relationships ADD COLUMN IF NOT EXISTS voice_calls integer NOT NULL DEFAULT 0`,
  `ALTER TABLE character_relationships ADD COLUMN IF NOT EXISTS stories_viewed integer NOT NULL DEFAULT 0`,
  `ALTER TABLE character_relationships ADD COLUMN IF NOT EXISTS stories_liked integer NOT NULL DEFAULT 0`,
];

async function main() {
  const pool = getPool();
  let ok = 0, skip = 0;
  for (const sql of migrations) {
    try {
      await pool.query(sql);
      ok++;
    } catch (e: any) {
      skip++;
      if (!e.message?.includes('already exists') && !e.message?.includes('duplicate')) {
        console.log('ERR:', e.message?.substring(0, 100));
      }
    }
  }
  console.log(`Migration: ${ok} applied, ${skip} skipped (${ok + skip} total)`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
