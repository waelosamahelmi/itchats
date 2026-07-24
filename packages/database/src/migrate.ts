import 'dotenv/config';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getDb } from './src/connection';

async function main() {
  const db = getDb();
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './migrations' });
  console.log('Migrations complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
