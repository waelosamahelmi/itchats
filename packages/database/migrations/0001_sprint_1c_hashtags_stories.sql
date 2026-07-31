-- Migration: Add hashtags, post_hashtags, and story indexes
-- Sprint 1C: Stories and Feed improvements

-- Create hashtags table
CREATE TABLE IF NOT EXISTS hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create post_hashtags junction table
CREATE TABLE IF NOT EXISTS post_hashtags (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, hashtag_id)
);

-- Indexes for post_hashtags
CREATE INDEX IF NOT EXISTS idx_post_hashtags_post ON post_hashtags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag ON post_hashtags(hashtag_id);

-- Add story active indexes
CREATE INDEX IF NOT EXISTS idx_stories_active_user ON stories(author_user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_active_character ON stories(author_character_id, expires_at DESC);

-- Ensure story_views table exists with proper index
CREATE INDEX IF NOT EXISTS idx_story_views_user ON story_views(viewer_user_id, story_id);
