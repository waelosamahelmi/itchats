-- ItChats Database Migration v1
-- Generated from Drizzle ORM schema definitions
-- Date: 2026-07-24

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enums (idempotent: the live DB may already have these via drizzle-kit push)
DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('pending','active','suspended','deleted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE character_visibility AS ENUM ('private','public','unlisted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE character_status AS ENUM ('draft','generating_identity','ready','published','suspended','disabled','deleted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE identity_origin AS ENUM ('text_generated','private_text_generated','private_uploaded_reference','private_image_to_image','public_regenerated_from_private_metadata');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE conversation_type AS ENUM ('human_human','human_character','group');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE message_sender_type AS ENUM ('user','character','system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE message_type AS ENUM ('text','image','video','audio','voice_note','system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE generation_type AS ENUM ('llm_chat','character_autofill','character_reference','text_to_image','image_to_image','text_to_video','image_to_video','reference_to_video','tts','asr','embedding','moderation','memory_extract','story_plan');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE generation_status AS ENUM ('queued','processing','succeeded','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE media_visibility AS ENUM ('private','public');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE story_status AS ENUM ('draft','scheduled','generating','published','expired','failed','removed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE moderation_status AS ENUM ('pending','approved','flagged','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('trialing','active','past_due','paused','cancelled','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Core tables
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE,
  username citext UNIQUE,
  password_hash text,
  status user_status NOT NULL DEFAULT 'pending',
  role text NOT NULL DEFAULT 'user',
  locale text NOT NULL DEFAULT 'en',
  timezone text NOT NULL DEFAULT 'UTC',
  date_of_birth date,
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name text,
  bio text,
  avatar_media_id uuid,
  theme_id text NOT NULL DEFAULT 'midnight',
  discoverable boolean NOT NULL DEFAULT true,
  private_account boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  device_id uuid,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  rotated_from_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_wallets (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_credited bigint NOT NULL DEFAULT 0,
  lifetime_debited bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta bigint NOT NULL,
  balance_after bigint NOT NULL,
  reason text NOT NULL,
  reference_type text,
  reference_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_created ON credit_ledger(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  monthly_price_usd numeric(12,4) NOT NULL,
  monthly_credits bigint NOT NULL,
  max_private_characters integer NOT NULL,
  max_public_characters integer NOT NULL,
  max_auto_story_characters integer NOT NULL,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES subscription_plans(id),
  provider text NOT NULL DEFAULT 'stripe',
  provider_customer_id text,
  provider_subscription_id text UNIQUE,
  status subscription_status NOT NULL,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  handle citext UNIQUE,
  visibility character_visibility NOT NULL DEFAULT 'private',
  status character_status NOT NULL DEFAULT 'draft',
  identity_origin identity_origin NOT NULL,
  identity_version integer NOT NULL DEFAULT 1,
  avatar_media_id uuid,
  description text NOT NULL DEFAULT '',
  personality text NOT NULL DEFAULT '',
  backstory text NOT NULL DEFAULT '',
  age_display text,
  gender text,
  pronouns text,
  occupation text,
  interests jsonb NOT NULL DEFAULT '[]'::jsonb,
  languages jsonb NOT NULL DEFAULT '["en"]'::jsonb,
  default_language text NOT NULL DEFAULT 'en',
  is_ai_disclosure_required boolean NOT NULL DEFAULT true,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type conversation_type NOT NULL,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  title text,
  summary text,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type message_sender_type NOT NULL,
  sender_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  sender_character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  type message_type NOT NULL DEFAULT 'text',
  content text,
  reply_to_message_id uuid,
  client_idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  UNIQUE(conversation_id, client_idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  author_character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  status story_status NOT NULL DEFAULT 'draft',
  caption text,
  story_type text NOT NULL,
  generated boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((author_user_id IS NOT NULL AND author_character_id IS NULL) OR (author_user_id IS NULL AND author_character_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at, created_at DESC);

CREATE TABLE IF NOT EXISTS character_follows (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, character_id)
);

CREATE TABLE IF NOT EXISTS user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  blocked_character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (blocked_user_id IS NOT NULL OR blocked_character_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  reason text NOT NULL,
  detail text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  generation_type generation_type NOT NULL,
  status generation_status NOT NULL DEFAULT 'queued',
  route_key text NOT NULL,
  idempotency_key text NOT NULL,
  request_json jsonb NOT NULL,
  response_json jsonb,
  error_code text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, idempotency_key)
);

-- Seed plans
INSERT INTO subscription_plans (id, name, monthly_price_usd, monthly_credits, max_private_characters, max_public_characters, max_auto_story_characters, sort_order) VALUES
('free', 'Free', 0, 1000, 1, 1, 0, 0),
('plus', 'Plus', 9.99, 12000, 5, 2, 1, 1),
('pro', 'Pro', 24.99, 35000, 15, 6, 3, 2),
('creator', 'Creator', 49.99, 80000, 40, 20, 10, 3),
('studio', 'Studio', 99.99, 180000, 100, 50, 25, 4)
ON CONFLICT (id) DO NOTHING;
