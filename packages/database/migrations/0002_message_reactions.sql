DO $$ BEGIN
  CREATE TYPE "public"."reaction_actor_type" AS ENUM ('user', 'character');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "message_reactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "message_id" uuid NOT NULL REFERENCES "messages"("id") ON DELETE CASCADE,
  "actor_type" "reaction_actor_type" NOT NULL,
  "actor_user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "actor_character_id" uuid REFERENCES "characters"("id") ON DELETE CASCADE,
  "emoji" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "message_reactions_exactly_one_actor" CHECK (
    (actor_type = 'user' AND actor_user_id IS NOT NULL AND actor_character_id IS NULL)
    OR
    (actor_type = 'character' AND actor_character_id IS NOT NULL AND actor_user_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS "message_reactions_message_user_unique"
  ON "message_reactions" ("message_id", "actor_user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "message_reactions_message_character_unique"
  ON "message_reactions" ("message_id", "actor_character_id");
