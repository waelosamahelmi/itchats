import { Controller, Get, Patch, Delete, Param, Body } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { users, userProfiles } from '@itchats/database/schema';
import { eq } from 'drizzle-orm';

@Controller('v1/users')
export class UsersController {
  @Get('me')
  async getMe() {
    // TODO: Extract from auth context
    return { message: 'Auth required' };
  }

  @Patch('me')
  async updateMe(@Body() body: unknown) {
    return { message: 'Auth required', body };
  }

  @Get(':handle')
  async getByHandle(@Param('handle') handle: string) {
    const db = getDb();
    const [user] = await db.select({ id: users.id, username: users.username }).from(users).where(eq(users.username, handle)).limit(1);
    if (!user) return { error: 'Not found' };
    return { user };
  }
}
