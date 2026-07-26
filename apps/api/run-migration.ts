import 'dotenv/config';
import { getPool } from '../../packages/database/src/connection';

const migrations = [
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
