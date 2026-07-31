-- Migration 0005: Create every schema-defined table that had no CREATE TABLE migration.
-- All statements are idempotent so this can run against a database that already
-- received these objects via `drizzle-kit push`.

-- ── Enums missing from prior migrations ──
DO $$ BEGIN
  CREATE TYPE post_visibility AS ENUM ('public','friends','private');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE post_reaction_type AS ENUM ('like','love','haha','wow','sad','angry','care');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE character_mood AS ENUM ('happy','sad','excited','angry','upset','loving','depressed','horny','neutral','curious','anxious','playful');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE character_post_frequency AS ENUM ('low','medium','high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reference_pack_status AS ENUM ('generating','ready','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE friend_status AS ENUM ('pending','accepted','blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE voice_gender AS ENUM ('male','female');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Media ──
CREATE TABLE IF NOT EXISTS media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  url text NOT NULL DEFAULT '',
  visibility media_visibility NOT NULL,
  storage_provider text NOT NULL,
  bucket text NOT NULL,
  object_key text NOT NULL,
  mime_type text NOT NULL,
  media_type text NOT NULL,
  width integer,
  height integer,
  duration_ms integer,
  bytes integer,
  sha256 text,
  moderation_status text NOT NULL DEFAULT 'pending',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ── Posts ──
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  author_character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  content text,
  media_url text,
  media_type text,
  thumbnail_url text,
  visibility post_visibility NOT NULL DEFAULT 'public',
  repost_of_post_id uuid,
  nsfw boolean NOT NULL DEFAULT false,
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  share_count integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  is_ai_generated boolean NOT NULL DEFAULT false,
  source_news_url text,
  source_news_title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_posts_author_user ON posts(author_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_character ON posts(author_character_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility, created_at DESC);

CREATE TABLE IF NOT EXISTS post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  reaction_type post_reaction_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS post_reactions_post_user_unique ON post_reactions(post_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS post_reactions_post_character_unique ON post_reactions(post_id, character_id);

CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  parent_comment_id uuid,
  content text NOT NULL,
  is_ai_generated boolean NOT NULL DEFAULT false,
  like_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent ON post_comments(parent_comment_id, created_at);

CREATE TABLE IF NOT EXISTS post_link_previews (
  post_id uuid PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  url text NOT NULL,
  canonical_url text,
  title text,
  description text,
  image_url text,
  site_name text,
  favicon_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  reaction_type post_reaction_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS comment_reactions_comment_user_unique ON post_comment_reactions(comment_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS comment_reactions_comment_character_unique ON post_comment_reactions(comment_id, character_id);

-- ── Users domain ──
CREATE TABLE IF NOT EXISTS auth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_account_id text NOT NULL,
  access_token_encrypted text,
  refresh_token_encrypted text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text,
  platform text,
  user_agent text,
  last_ip text,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id uuid,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  enabled text NOT NULL DEFAULT 'true',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);

CREATE TABLE IF NOT EXISTS user_scores (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  character_popularity integer NOT NULL DEFAULT 0,
  posts_engagement integer NOT NULL DEFAULT 0,
  daily_activity integer NOT NULL DEFAULT 0,
  weekly_activity integer NOT NULL DEFAULT 0,
  rank text NOT NULL DEFAULT 'Newcomer',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status friend_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS user_friends_user_friend_unique ON user_friends(user_id, friend_id);

-- ── Social ──
CREATE TABLE IF NOT EXISTS content_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  parent_comment_id uuid,
  content text NOT NULL,
  moderation_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE reports ADD COLUMN IF NOT EXISTS assigned_admin_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports(status, created_at);

-- ── Stories ──
CREATE TABLE IF NOT EXISTS story_views (
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

-- ── Conversations ──
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_message_id uuid,
  muted_until timestamptz,
  archived_at timestamptz,
  proactive_messages_enabled boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS conversation_participants_user_unique ON conversation_participants(conversation_id, user_id);
-- Column may be missing when the table was created earlier via drizzle-kit push
ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS proactive_messages_enabled boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_conversations_character ON conversations(character_id, last_message_at);

-- ── Messages ──
CREATE TABLE IF NOT EXISTS message_attachments (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  media_asset_id uuid NOT NULL,
  sort_order text NOT NULL DEFAULT '0'
);

-- Columns other code already writes to (voice notes / media / delivery state / metadata)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id uuid;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_asset_id uuid;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS transcription text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS duration_ms integer;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- ── Character satellite tables ──
CREATE TABLE IF NOT EXISTS character_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  version integer NOT NULL,
  canonical_prompt text NOT NULL,
  negative_prompt text,
  structured_identity jsonb NOT NULL,
  source_identity_origin identity_origin NOT NULL,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS character_voice_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  provider_id text,
  model_key text,
  voice_key text,
  language text,
  speed text NOT NULL DEFAULT '1.0',
  pitch text,
  style jsonb NOT NULL DEFAULT '{}'::jsonb,
  preview_media_id uuid,
  active text NOT NULL DEFAULT 'true',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS character_locations (
  character_id uuid PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  city text,
  region text,
  country_code text,
  timezone text,
  public_point_lon text,
  public_point_lat text,
  location_label text,
  source text NOT NULL DEFAULT 'declared',
  precision_meters integer NOT NULL DEFAULT 5000,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS character_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visible_level text NOT NULL DEFAULT '1.0',
  familiarity text NOT NULL DEFAULT '0',
  trust text NOT NULL DEFAULT '0',
  warmth text NOT NULL DEFAULT '0',
  affinity text NOT NULL DEFAULT '0',
  tension text NOT NULL DEFAULT '0',
  comfort text NOT NULL DEFAULT '0',
  attachment text NOT NULL DEFAULT '0',
  curiosity text NOT NULL DEFAULT '0',
  respect text NOT NULL DEFAULT '0',
  chemistry text NOT NULL DEFAULT '0',
  romance text NOT NULL DEFAULT '0',
  humor text NOT NULL DEFAULT '0',
  inside_jokes jsonb NOT NULL DEFAULT '[]'::jsonb,
  shared_memories jsonb NOT NULL DEFAULT '[]'::jsonb,
  compatibility text NOT NULL DEFAULT '0',
  last_conflict timestamptz,
  last_gift timestamptz,
  days_known integer NOT NULL DEFAULT 0,
  conversation_count integer NOT NULL DEFAULT 0,
  image_requests integer NOT NULL DEFAULT 0,
  voice_calls integer NOT NULL DEFAULT 0,
  stories_viewed integer NOT NULL DEFAULT 0,
  stories_liked integer NOT NULL DEFAULT 0,
  interaction_count integer NOT NULL DEFAULT 0,
  last_interaction_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS character_reference_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  character_version_id uuid NOT NULL,
  reference_pack_id uuid,
  media_asset_id uuid NOT NULL,
  reference_type text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  generation_job_id uuid,
  approved boolean NOT NULL DEFAULT false,
  quality_score numeric(6,4),
  prompt text,
  negative_prompt text,
  seed text,
  identity_score numeric(6,4),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS character_reference_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  character_version_id uuid NOT NULL,
  status reference_pack_status NOT NULL DEFAULT 'generating',
  canonical_seed text,
  provider text NOT NULL DEFAULT 'alibaba',
  model text NOT NULL DEFAULT 'qwen-image-2.0-pro',
  identity_score numeric(6,4),
  image_count integer NOT NULL DEFAULT 0,
  generated_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ref_packs_character ON character_reference_packs(character_id, created_at DESC);

CREATE TABLE IF NOT EXISTS character_autonomy (
  character_id uuid PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  can_post_stories boolean NOT NULL DEFAULT false,
  can_post_feed boolean NOT NULL DEFAULT false,
  can_search_news boolean NOT NULL DEFAULT false,
  story_frequency_hours integer NOT NULL DEFAULT 24,
  post_frequency_hours integer NOT NULL DEFAULT 12,
  news_interests jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_story_at timestamptz,
  last_news_search_at timestamptz,
  story_photo_pool jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_daily_posts integer NOT NULL DEFAULT 3,
  max_daily_stories integer NOT NULL DEFAULT 2,
  media_budget_type text NOT NULL DEFAULT 'monthly',
  max_images_per_period integer NOT NULL DEFAULT 0,
  max_videos_per_period integer NOT NULL DEFAULT 0,
  media_budget_credits integer NOT NULL DEFAULT 0,
  media_budget_active boolean NOT NULL DEFAULT false,
  media_budget_start_at timestamptz,
  media_budget_next_renewal_at timestamptz,
  images_used_this_period integer NOT NULL DEFAULT 0,
  videos_used_this_period integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS character_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  content text NOT NULL,
  memory_type text NOT NULL,
  importance numeric(5,4) NOT NULL DEFAULT 0.5,
  confidence numeric(5,4) NOT NULL DEFAULT 0.5,
  source_message_ids uuid[] NOT NULL DEFAULT '{}',
  last_recalled_at timestamptz,
  recall_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_character_memories_scope ON character_memories(character_id, user_id, created_at DESC);

-- ── AI model registry ──
CREATE TABLE IF NOT EXISTS ai_providers (
  id text PRIMARY KEY,
  name text NOT NULL,
  enabled text NOT NULL DEFAULT 'true',
  config_key text NOT NULL,
  base_url_key text,
  region text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id text NOT NULL REFERENCES ai_providers(id),
  model_key text NOT NULL,
  display_name text NOT NULL,
  capability text NOT NULL,
  deployment_scope text,
  region text,
  enabled text NOT NULL DEFAULT 'true',
  priority integer NOT NULL DEFAULT 100,
  pricing_rule jsonb NOT NULL,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS model_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_key text NOT NULL,
  model_id uuid NOT NULL REFERENCES ai_models(id),
  priority integer NOT NULL DEFAULT 100,
  enabled text NOT NULL DEFAULT 'true',
  min_plan_id text,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  version integer NOT NULL,
  content text NOT NULL,
  schema_json jsonb,
  enabled text NOT NULL DEFAULT 'true',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id text REFERENCES ai_providers(id),
  model_id uuid REFERENCES ai_models(id),
  incident_type text NOT NULL,
  status text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Admin ──
CREATE TABLE IF NOT EXISTS feature_flags (
  key text PRIMARY KEY,
  description text,
  enabled text NOT NULL DEFAULT 'false',
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_memberships (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES admin_roles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  before_json jsonb,
  after_json jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at DESC);

-- ── Usage events (legacy pricing) ──
CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  generation_job_id uuid REFERENCES generation_jobs(id) ON DELETE SET NULL,
  provider_id text,
  model_id uuid,
  generation_type generation_type NOT NULL,
  input_tokens integer,
  output_tokens integer,
  input_characters integer,
  audio_seconds numeric(12,3),
  video_seconds numeric(12,3),
  image_count integer,
  provider_cost_usd numeric(18,8) NOT NULL DEFAULT 0,
  overhead_factor numeric(8,4) NOT NULL DEFAULT 1,
  target_margin numeric(8,4) NOT NULL DEFAULT 0,
  calculated_retail_usd numeric(18,8) NOT NULL DEFAULT 0,
  credits_debited integer NOT NULL DEFAULT 0,
  pricing_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_created ON usage_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_model_created ON usage_events(model_id, created_at DESC);

-- ── Treasury ──
CREATE TABLE IF NOT EXISTS treasury_journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  external_id text,
  idempotency_key text NOT NULL UNIQUE,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS treasury_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id uuid NOT NULL REFERENCES treasury_journals(id),
  account_code text NOT NULL,
  direction text NOT NULL,
  amount_minor bigint NOT NULL,
  currency varchar(3) NOT NULL,
  reference_type text,
  reference_id text,
  user_id uuid,
  provider text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT direction_check CHECK (direction IN ('debit','credit')),
  CONSTRAINT amount_positive CHECK (amount_minor >= 0)
);

CREATE TABLE IF NOT EXISTS treasury_accounts (
  code text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  balance_minor bigint NOT NULL DEFAULT 0,
  currency varchar(3) NOT NULL DEFAULT 'EUR',
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS provider_treasury_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  display_name text NOT NULL,
  settlement_mode text NOT NULL DEFAULT 'provider_auto_charge',
  currency varchar(3) NOT NULL DEFAULT 'USD',
  estimated_unbilled_cost_minor bigint NOT NULL DEFAULT 0,
  confirmed_billed_cost_minor bigint NOT NULL DEFAULT 0,
  outstanding_payable_minor bigint NOT NULL DEFAULT 0,
  spend_24h_minor bigint NOT NULL DEFAULT 0,
  spend_30d_minor bigint NOT NULL DEFAULT 0,
  forecast_7d_minor bigint NOT NULL DEFAULT 0,
  reserve_target_minor bigint NOT NULL DEFAULT 0,
  reserve_status text NOT NULL DEFAULT 'healthy',
  account_status text NOT NULL DEFAULT 'active',
  last_reconciled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS provider_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  model text NOT NULL,
  operation text NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'USD',
  input_unit text NOT NULL,
  input_price numeric(24,12) NOT NULL,
  output_unit text,
  output_price numeric(24,12),
  minimum_charge numeric(24,12) NOT NULL DEFAULT 0,
  effective_from timestamptz NOT NULL,
  effective_until timestamptz,
  verified_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  user_id uuid,
  provider text NOT NULL,
  model text NOT NULL,
  feature text NOT NULL,
  provider_request_id text,
  input_tokens bigint,
  output_tokens bigint,
  audio_input_ms bigint,
  audio_output_ms bigint,
  image_count integer,
  video_ms bigint,
  quoted_cost_minor bigint,
  actual_cost_minor bigint,
  cost_currency varchar(3) NOT NULL,
  customer_charge_minor bigint,
  customer_currency varchar(3) NOT NULL,
  margin_percent numeric(6,3),
  status text NOT NULL DEFAULT 'completed',
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_provider_usage_user ON provider_usage_events(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_usage_provider ON provider_usage_events(provider, started_at DESC);

CREATE TABLE IF NOT EXISTS usage_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  feature text NOT NULL,
  estimated_provider_cost_minor bigint NOT NULL,
  estimated_customer_price_minor bigint NOT NULL,
  actual_provider_cost_minor bigint,
  actual_customer_price_minor bigint,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT uq_user_idempotency UNIQUE (user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON usage_reservations(status, created_at);

CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  external_event_id text NOT NULL,
  event_type text NOT NULL,
  payload_hash text NOT NULL,
  status text NOT NULL DEFAULT 'received',
  attempt_count integer NOT NULL DEFAULT 1,
  processed_at timestamptz,
  error text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_webhook_provider_event UNIQUE (provider, external_event_id)
);

CREATE TABLE IF NOT EXISTS treasury_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date text NOT NULL UNIQUE,
  currency varchar(3) NOT NULL DEFAULT 'EUR',
  gross_revenue bigint NOT NULL DEFAULT 0,
  net_revenue bigint NOT NULL DEFAULT 0,
  provider_accrued bigint NOT NULL DEFAULT 0,
  provider_settled bigint NOT NULL DEFAULT 0,
  provider_payable bigint NOT NULL DEFAULT 0,
  refunds_reserve bigint NOT NULL DEFAULT 0,
  tax_reserve bigint NOT NULL DEFAULT 0,
  operating_reserve bigint NOT NULL DEFAULT 0,
  safe_withdrawable bigint NOT NULL DEFAULT 0,
  stripe_available bigint,
  active_paid_users integer NOT NULL DEFAULT 0,
  gross_margin_percent numeric(6,3),
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS margin_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target_gross_margin numeric(6,4) NOT NULL DEFAULT 0.75,
  warning_margin numeric(6,4) NOT NULL DEFAULT 0.55,
  hard_minimum_margin numeric(6,4) NOT NULL DEFAULT 0.35,
  provider text,
  model text,
  feature text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  message text NOT NULL,
  provider text,
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS provider_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  external_invoice_id text,
  currency varchar(3) NOT NULL,
  subtotal_minor bigint NOT NULL,
  tax_minor bigint NOT NULL DEFAULT 0,
  total_minor bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  period_start timestamptz,
  period_end timestamptz,
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  raw_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- ── Voices ──
CREATE TABLE IF NOT EXISTS pre_generated_voices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_key text NOT NULL UNIQUE,
  label text NOT NULL,
  gender voice_gender NOT NULL,
  style text NOT NULL,
  description text NOT NULL,
  audio_url text,
  sample_text text,
  duration integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
