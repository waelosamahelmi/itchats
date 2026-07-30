DO $$ BEGIN
  CREATE TYPE "public"."conversation_mode" AS ENUM ('chat', 'roleplay');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "conversations"
  ADD COLUMN IF NOT EXISTS "mode" "conversation_mode" DEFAULT 'chat' NOT NULL;
