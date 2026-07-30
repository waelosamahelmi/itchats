import { getPool, getDb } from '@itchats/database';
import { conversations, messages } from '@itchats/database/schema';
import { eq, and } from 'drizzle-orm';

async function main() {
  const pool = getPool();

  // Find a conversation with messages
  const convs = await pool.query("SELECT id, created_by_user_id, type FROM conversations LIMIT 5");
  for (const conv of convs.rows) {
    console.log(`\nConv: ${conv.id} type: ${conv.type} owner: ${conv.created_by_user_id}`);
    const msgs = await pool.query(
      "SELECT id, content, sender_type FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 3",
      [conv.id]
    );
    console.log(`  Messages: ${msgs.rows.length}`);
    for (const msg of msgs.rows) {
      console.log(`    ${msg.id}: [${msg.sender_type}] ${(msg.content ?? '').slice(0, 50)}`);
    }
  }

  // Check if message_reactions PK constraint name might be different
  const pk = await pool.query(
    "SELECT conname FROM pg_constraint WHERE conrelid = 'message_reactions'::regclass AND contype = 'p'"
  );
  console.log('\nmessage_reactions PK:', pk.rows.map((r: any) => r.conname).join(', '));

  await pool.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
