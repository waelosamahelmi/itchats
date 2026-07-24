import { getPool } from '@itchats/database';
const pool = getPool();
try {
  const r = await pool.query('UPDATE users SET role = $1 WHERE email = $2 RETURNING id, email, role', ['admin', 'wael@helmies.fi']);
  if (r.rows.length === 0) { console.log('User not found'); }
  else { console.log('Admin OK:', r.rows[0].email, '->', r.rows[0].role); }
} catch(e) { console.error(e.message); }
process.exit(0);
