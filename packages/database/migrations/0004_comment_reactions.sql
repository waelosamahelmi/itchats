-- Add comment reaction support with uniqueness constraints
CREATE TABLE IF NOT EXISTS post_comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Uniqueness constraints: one reaction per user per comment, one per character per comment
CREATE UNIQUE INDEX IF NOT EXISTS comment_reactions_comment_user_unique
  ON post_comment_reactions(comment_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS comment_reactions_comment_character_unique
  ON post_comment_reactions(comment_id, character_id)
  WHERE character_id IS NOT NULL;

-- Indexes for comment thread queries
CREATE INDEX IF NOT EXISTS idx_post_comments_post
  ON post_comments(post_id, created_at);

CREATE INDEX IF NOT EXISTS idx_post_comments_parent
  ON post_comments(parent_comment_id, created_at);
