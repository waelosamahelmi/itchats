import { Injectable, UnauthorizedException } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { users } from '@itchats/database/schema';
import { eq } from 'drizzle-orm';
import * as crypto from 'node:crypto';

@Injectable()
export class AuthService {
  async validateUser(email: string, password: string) {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return null;

    // TODO: Implement proper Argon2id verification
    const valid = user.passwordHash === crypto.createHash('sha256').update(password).digest('hex');
    if (!valid) return null;

    return { id: user.id, email: user.email, username: user.username, role: user.role };
  }

  async generateTokens(userId: string) {
    // TODO: Implement JWT with proper signing
    const accessToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = crypto.randomBytes(48).toString('hex');
    return { accessToken, refreshToken, expiresIn: 900 };
  }
}
