-- Add all missing columns from the full characters schema
ALTER TABLE characters ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS handle text;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS identity_version integer DEFAULT 1;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS avatar_media_id uuid;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS description text DEFAULT '';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS age_display text;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS pronouns text;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS interests jsonb DEFAULT '[]';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS humor_style text;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS languages jsonb DEFAULT '["en"]';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS default_language text DEFAULT 'en';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS emotion_state jsonb DEFAULT '{}';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS autonomy_config jsonb DEFAULT '{}';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS content_style jsonb DEFAULT '{}';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'pending';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_ai_disclosure_required text DEFAULT 'true';

-- Create missing tables
CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  joined_at timestamp with time zone DEFAULT now(),
  last_read_at timestamp with time zone,
  UNIQUE(conversation_id, user_id, character_id)
);

CREATE TABLE IF NOT EXISTS character_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  version integer NOT NULL,
  canonical_prompt text NOT NULL,
  negative_prompt text,
  structured_identity jsonb NOT NULL,
  source_identity_origin text NOT NULL,
  locked_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS character_voice_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  voice_id text,
  provider text,
  settings jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);
