import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getDb } from '@itchats/database';
import { users, refreshTokens, devices } from '@itchats/database/schema';
import { eq, sql } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { randomBytes, createHash } from 'node:crypto';
import { getConfig } from '@itchats/config';

export interface TokenPair { accessToken: string; refreshToken: string; expiresIn: number; }
export interface JwtPayload { sub: string; email: string; role: string; }

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async hashPassword(password: string) {
    return argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 });
  }
  async verifyPassword(hash: string, password: string) { return argon2.verify(hash, password); }

  async register(email: string, username: string, password: string) {
    const db = getDb();
    // Use raw SQL for citext comparison
    const eResult = await db.execute(sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`);
    if (eResult.rows.length > 0) throw new UnauthorizedException('Email already registered');
    const uResult = await db.execute(sql`SELECT id FROM users WHERE username = ${username} LIMIT 1`);
    if (uResult.rows.length > 0) throw new UnauthorizedException('Username taken');
    const pw = await this.hashPassword(password);

    // Use raw SQL insert to avoid Drizzle enum/citext issues
    const result = await db.execute(sql`
      INSERT INTO users (email, username, password_hash, status)
      VALUES (${email}, ${username}, ${pw}, 'active')
      RETURNING id, email, username, role
    `);
    const user = result.rows[0] as { id: string; email: string; username: string; role: string };
    if (!user) throw new Error('Failed to create user');

    // Welcome wallet via raw SQL
    await db.execute(sql`
      INSERT INTO credit_wallets (user_id, balance) VALUES (${user.id}, 1000) ON CONFLICT DO NOTHING
    `);

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user: { id: user.id, email: user.email, username: user.username, role: user.role }, ...tokens };
  }

  async login(email: string, password: string, deviceInfo?: { userAgent?: string; ip?: string }) {
    const db = getDb();
    // Use raw SQL to avoid Drizzle citext/enum issues
    const result = await db.execute(sql`
      SELECT id, email, username, password_hash, role, status::text as status
      FROM users WHERE email = ${email} LIMIT 1
    `);
    const row = result.rows[0] as { id: string; email: string; username: string; password_hash: string; role: string; status: string } | undefined;
    if (!row || !(await this.verifyPassword(row.password_hash, password))) throw new UnauthorizedException('Invalid credentials');
    if (row.status !== 'active') throw new UnauthorizedException('Account inactive');

    await db.execute(sql`UPDATE users SET last_login_at = NOW() WHERE id = ${row.id}`);
    if (deviceInfo?.userAgent) {
      await db.execute(sql`INSERT INTO devices (user_id, user_agent, last_ip, last_seen_at) VALUES (${row.id}, ${deviceInfo.userAgent}, ${deviceInfo.ip ?? null}, NOW())`);
    }
    const tokens = await this.generateTokens(row.id, row.email, row.role);
    return { user: { id: row.id, email: row.email, username: row.username, role: row.role }, ...tokens };
  }

  async generateTokens(userId: string, email: string, role: string): Promise<TokenPair> {
    const config = getConfig();
    const accessToken = this.jwtService.sign({ sub: userId, email, role });
    const refreshValue = randomBytes(48).toString('hex');
    const tokenHash = createHash('sha256').update(refreshValue).digest('hex');
    const db = getDb();
    await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt: new Date(Date.now() + 30 * 86400000) });
    return { accessToken, refreshToken: refreshValue, expiresIn: 900 };
  }

  async refresh(refreshValue: string): Promise<TokenPair> {
    const db = getDb();
    const tokenHash = createHash('sha256').update(refreshValue).digest('hex');
    const [s] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash)).limit(1);
    if (!s || s.revokedAt || s.expiresAt < new Date()) throw new UnauthorizedException('Invalid token');
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, s.id));
    const uResult = await db.execute(sql`SELECT id, email, role FROM users WHERE id = ${s.userId} LIMIT 1`);
    const user = uResult.rows[0] as { id: string; email: string; role: string } | undefined;
    if (!user) throw new UnauthorizedException('User not found');
    return this.generateTokens(user.id, user.email, user.role);
  }

  async logout(userId: string) {
    await getDb().execute(sql`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ${userId}`);
    return { loggedOut: true };
  }

  async validateUserById(userId: string) {
    const db = getDb();
    const result = await db.execute(sql`SELECT id, email, username, role, status::text as status FROM users WHERE id = ${userId} LIMIT 1`);
    const u = result.rows[0] as { id: string; email: string; username: string; role: string; status: string } | undefined;
    return u && u.status === 'active' ? u : null;
  }
}
