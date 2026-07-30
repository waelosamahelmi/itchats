import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getDb, getPool } from '@itchats/database';
import { refreshTokens, authAccounts } from '@itchats/database/schema';
import { eq, and } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { randomBytes, createHash } from 'node:crypto';
import { getConfig } from '@itchats/config';
import type { OAuthProfile } from './google.strategy';

export interface TokenPair { accessToken: string; refreshToken: string; expiresIn: number; }
export interface JwtPayload { sub: string; email: string; role: string; }

@Injectable()
export class AuthService {
  constructor(@Inject(JwtService) private readonly jwtService: JwtService) {}

  async hashPassword(password: string) {
    return argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 });
  }
  async verifyPassword(hash: string, password: string) { return argon2.verify(hash, password); }

  async register(email: string, username: string, password: string, dateOfBirth?: string, agreedToTerms?: boolean, gender?: string, lookingFor?: string, interestedIn?: string) {
    const pool = getPool();
    const eCheck = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
    if (eCheck.rows.length > 0) throw new UnauthorizedException('Email already registered');
    const uCheck = await pool.query('SELECT id FROM users WHERE username = $1 LIMIT 1', [username]);
    if (uCheck.rows.length > 0) throw new UnauthorizedException('Username taken');
    const pw = await this.hashPassword(password);

    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash, status, date_of_birth) VALUES ($1, $2, $3, 'active', $4) RETURNING id, email, username, role`,
      [email, username, pw, dateOfBirth || null],
    );
    const user = result.rows[0] as { id: string; email: string; username: string; role: string };
    if (!user) throw new Error('Failed to create user');

    // Create user profile with metadata
    await pool.query(
      `INSERT INTO user_profiles (user_id, display_name, gender, looking_for, interested_in, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) ON CONFLICT DO NOTHING`,
      [user.id, username, gender || null, lookingFor || null, interestedIn || null],
    );

    // Store terms agreement timestamp in user metadata (we use a separate query)
    if (agreedToTerms) {
      await pool.query(
        `UPDATE users SET updated_at = NOW() WHERE id = $1`,
        [user.id],
      );
    }

    await pool.query('INSERT INTO credit_wallets (user_id, balance) VALUES ($1, 1000) ON CONFLICT DO NOTHING', [user.id]);
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        firstLogin: true,
        agreedToTerms: agreedToTerms || false,
      },
      ...tokens,
    };
  }

  async login(email: string, password: string, deviceInfo?: { userAgent?: string; ip?: string }) {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, email, username, password_hash, role, status::text as status FROM users WHERE email = $1 LIMIT 1',
      [email],
    );
    const row = result.rows[0] as { id: string; email: string; username: string; password_hash: string; role: string; status: string } | undefined;
    if (!row) throw new UnauthorizedException('No account found with this email');
    if (row.status === 'pending') throw new UnauthorizedException('Please verify your email first');
    if (row.status !== 'active') throw new UnauthorizedException('Account is ' + row.status);
    if (!(await this.verifyPassword(row.password_hash, password))) throw new UnauthorizedException('Wrong password');

    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [row.id]);
    if (deviceInfo?.userAgent) {
      await pool.query('INSERT INTO devices (user_id, user_agent, last_ip, last_seen_at) VALUES ($1, $2, $3, NOW())', [row.id, deviceInfo.userAgent, deviceInfo.ip ?? null]);
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
    await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt: new Date(Date.now() + 3650 * 86400000) } as any);
    return { accessToken, refreshToken: refreshValue, expiresIn: 900 };
  }

  async refresh(refreshValue: string): Promise<TokenPair> {
    const db = getDb();
    const tokenHash = createHash('sha256').update(refreshValue).digest('hex');
    const [s] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash)).limit(1);
    if (!s || s.revokedAt) throw new UnauthorizedException('Invalid token');
    await db.update(refreshTokens).set({ revokedAt: new Date() } as any).where(eq(refreshTokens.id, s.id));
    const pool = getPool();
    const uResult = await pool.query('SELECT id, email, role FROM users WHERE id = $1 LIMIT 1', [s.userId]);
    const user = uResult.rows[0] as { id: string; email: string; role: string } | undefined;
    if (!user) throw new UnauthorizedException('User not found');
    return this.generateTokens(user.id, user.email, user.role);
  }

  async logout(userId: string) {
    const pool = getPool();
    await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1', [userId]);
    return { loggedOut: true };
  }

  async validateUserById(userId: string) {
    const pool = getPool();
    const result = await pool.query('SELECT id, email, username, role, status::text as status FROM users WHERE id = $1 LIMIT 1', [userId]);
    const u = result.rows[0] as { id: string; email: string; username: string; role: string; status: string } | undefined;
    return u && u.status === 'active' ? u : null;
  }

  /** Find or create a user from an OAuth profile, returning JWT tokens */
  async oauthLogin(profile: OAuthProfile) {
    const pool = getPool();
    const db = getDb();

    // Check if this OAuth account is already linked
    const [existing] = await db
      .select()
      .from(authAccounts)
      .where(and(eq(authAccounts.provider, profile.provider), eq(authAccounts.providerAccountId, profile.providerId)))
      .limit(1);

    let userId: string;

    if (existing) {
      // Already linked — just log in
      userId = existing.userId;
    } else {
      // Check if email already registered
      const emailRow = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [profile.email]);

      if (emailRow.rows.length > 0) {
        // Email exists — link this OAuth account to existing user
        userId = emailRow.rows[0].id as string;
      } else {
        // New user — create account
        const username = this.sanitizeUsername(profile.name);
        const result = await pool.query(
          `INSERT INTO users (email, username, password_hash, status, email_verified_at) VALUES ($1, $2, NULL, 'active', NOW()) RETURNING id`,
          [profile.email, username],
        );
        userId = result.rows[0].id as string;
        await pool.query('INSERT INTO credit_wallets (user_id, balance) VALUES ($1, 1000) ON CONFLICT DO NOTHING', [userId]);
      }

      // Link the OAuth account
      await db.insert(authAccounts).values({
        userId,
        provider: profile.provider,
        providerAccountId: profile.providerId,
      } as any);
    }

    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userId]);
    const u = await pool.query('SELECT id, email, username, role FROM users WHERE id = $1', [userId]);
    const user = u.rows[0] as { id: string; email: string; username: string; role: string };
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user: { id: user.id, email: user.email, username: user.username, role: user.role }, ...tokens };
  }

  /** Link an OAuth account to the currently authenticated user */
  async linkOAuthAccount(userId: string, profile: OAuthProfile) {
    const db = getDb();
    await db.insert(authAccounts).values({
      userId,
      provider: profile.provider,
      providerAccountId: profile.providerId,
    } as any);
    return { linked: true, provider: profile.provider };
  }

  async forgotPassword(email: string) {
    const pool = getPool();
    const result = await pool.query('SELECT id FROM users WHERE email = $1 AND status = $2 LIMIT 1', [email, 'active']);
    if (result.rows.length === 0) return { sent: true }; // Don't reveal if email exists
    const userId = result.rows[0].id as string;
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const db = getDb();
    await db.insert(refreshTokens).values({
      userId, tokenHash,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
    } as any);
    // In production: send email. For dev: return token
    return { sent: true, devToken: token };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const db = getDb();
    const [s] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash)).limit(1);
    if (!s || s.revokedAt || (s.expiresAt && s.expiresAt < new Date())) throw new UnauthorizedException('Invalid or expired reset token');
    const pw = await this.hashPassword(newPassword);
    const pool = getPool();
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [pw, s.userId]);
    await db.update(refreshTokens).set({ revokedAt: new Date() } as any).where(eq(refreshTokens.id, s.id));
    return { reset: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const pool = getPool();
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1 LIMIT 1', [userId]);
    const row = result.rows[0] as { password_hash: string } | undefined;
    if (!row) throw new UnauthorizedException('User not found');

    const valid = await this.verifyPassword(row.password_hash, currentPassword);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    if (newPassword.length < 6) throw new UnauthorizedException('New password must be at least 6 characters');

    const pw = await this.hashPassword(newPassword);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [pw, userId]);

    // Revoke all refresh tokens for security
    const db = getDb();
    await db.update(refreshTokens).set({ revokedAt: new Date() } as any).where(eq(refreshTokens.userId, userId));

    return { changed: true };
  }

  private sanitizeUsername(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 30) || 'user';
    const suffix = Math.random().toString(36).slice(2, 8);
    return `${base}_${suffix}`;
  }
}
