import { getPool } from '@itchats/database';
const pool = getPool();
try {
  const u = await pool.query('SELECT id FROM users WHERE email = $1', ['wael@helmies.fi']);
  if (u.rows.length === 0) { console.log('User not found'); }
  else {
    await pool.query('INSERT INTO credit_wallets(user_id,balance) VALUES($1,30000) ON CONFLICT(user_id) DO UPDATE SET balance = credit_wallets.balance + 30000', [u.rows[0].id]);
    console.log('OK - 30000 credits added to', u.rows[0].id);
  }
} catch(e) { console.error(e.message); }
process.exit(0);
