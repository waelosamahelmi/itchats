-- Migration: Add user_settings table for persistent settings storage
-- Run: psql $DATABASE_URL -f add_user_settings.sql

CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, key)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);
