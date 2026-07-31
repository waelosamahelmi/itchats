-- conversation_participants existed in prod (via drizzle-kit push) before
-- muted_until/archived_at were added to the schema; 0005 only added
-- proactive_messages_enabled. Add the remaining schema-declared columns.
ALTER TABLE "conversation_participants" ADD COLUMN IF NOT EXISTS "muted_until" timestamptz;
ALTER TABLE "conversation_participants" ADD COLUMN IF NOT EXISTS "archived_at" timestamptz;
