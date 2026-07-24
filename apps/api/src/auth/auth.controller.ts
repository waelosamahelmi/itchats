import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterSchema, LoginSchema } from '@itchats/contracts';
import { getDb } from '@itchats/database';
import { users } from '@itchats/database/schema';
import { eq } from 'drizzle-orm';
import * as crypto from 'node:crypto';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: unknown) {
    const input = RegisterSchema.parse(body);
    const db = getDb();

    const [existing] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
    if (existing) {
      return { error: 'Email already registered' };
    }

    const [user] = await db.insert(users).values({
      email: input.email,
      username: input.username,
      passwordHash: crypto.createHash('sha256').update(input.password).digest('hex'),
      status: 'pending',
    }).returning();

    const tokens = await this.authService.generateTokens(user!.id);
    return { user: { id: user!.id, email: user!.email, username: user!.username }, ...tokens };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: unknown) {
    const input = LoginSchema.parse(body);
    const user = await this.authService.validateUser(input.email, input.password);
    if (!user) {
      return { error: 'Invalid credentials' };
    }
    const tokens = await this.authService.generateTokens(user.id);
    return { user, ...tokens };
  }
}
