import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getConfig } from '@itchats/config';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    const config = getConfig();
    _pool = new Pool({ connectionString: config.DATABASE_URL, max: 20 });
  }
  return _pool;
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

export const db = getDb();
