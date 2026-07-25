import "dotenv/config";
import { getPool } from "./src/connection";
import * as schema from "./src/schema/index";
import { drizzle } from "drizzle-orm/node-postgres";

async function push() {
  const pool = getPool();
  const db = drizzle(pool, { schema });

  // Push schema directly to DB
  const { drizzlePush } = await import("drizzle-kit/api");
  
  // Alternative: just run individual create table statements
  console.log("Schema push not available via API. Using manual approach...");

  // Create missing tables manually
  const tables = [
    `CREATE TABLE IF NOT EXISTS character_memories (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      type text NOT NULL,
      content text NOT NULL,
      importance real DEFAULT 0,
      metadata jsonb DEFAULT  \{}\',
      created_at timestamp with time zone DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS story_views (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      viewer_id uuid,
      viewed_at timestamp with time zone DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS auth_accounts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider text NOT NULL,
      provider_account_id text NOT NULL,
      access_token text,
      refresh_token text,
      expires_at timestamp with time zone,
      created_at timestamp with time zone DEFAULT now(),
      UNIQUE(provider, provider_account_id)
    )`,
  ];

  for (const sql of tables) {
    try {
      await pool.query(sql);
      console.log("OK:", sql.substring(0, 50) + "...");
    } catch (e: any) {
      console.log("SKIP:", e.message?.substring(0, 80));
    }
  }

  console.log("Done!");
  await pool.end();
}

push();
