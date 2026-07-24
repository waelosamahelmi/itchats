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
    const [e] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (e) throw new UnauthorizedException('Email already registered');
    const [u] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (u) throw new UnauthorizedException('Username taken');
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
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !(await this.verifyPassword(user.passwordHash!, password))) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== 'active') throw new UnauthorizedException('Account inactive');
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    if (deviceInfo?.userAgent) await db.insert(devices).values({ userId: user.id, userAgent: deviceInfo.userAgent, lastIp: deviceInfo.ip, lastSeenAt: new Date() });
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user: { id: user.id, email: user.email, username: user.username, role: user.role }, ...tokens };
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
    const [user] = await db.select().from(users).where(eq(users.id, s.userId)).limit(1);
    if (!user) throw new UnauthorizedException('User not found');
    return this.generateTokens(user.id, user.email, user.role);
  }

  async logout(userId: string) {
    await getDb().update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.userId, userId));
    return { loggedOut: true };
  }

  async validateUserById(userId: string) {
    const db = getDb();
    const [u] = await db.select({ id: users.id, email: users.email, username: users.username, role: users.role, status: users.status })
      .from(users).where(eq(users.id, userId)).limit(1);
    return u && u.status === 'active' ? u : null;
  }
}
