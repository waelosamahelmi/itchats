import { Injectable, NotFoundException } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { users, userProfiles } from '@itchats/database/schema';
import { eq, sql } from 'drizzle-orm';

@Injectable()
export class UsersService {
  async getMe(userId: string) {
    const db = getDb();
    const [user] = await db.select({
      id: users.id, email: users.email, username: users.username, role: users.role,
      status: users.status, createdAt: users.createdAt,
    }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundException('User not found');
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
    return { ...user, profile: profile ?? { displayName: null, bio: null } };
  }

  async updateMe(userId: string, data: { username?: string; displayName?: string; bio?: string; timezone?: string }) {
    const db = getDb();
    if (data.username) {
      await db.update(users).set({ username: data.username }).where(eq(users.id, userId));
    }
    if (data.timezone) {
      await db.update(users).set({ timezone: data.timezone }).where(eq(users.id, userId));
    }
    if (data.displayName || data.bio) {
      await db.insert(userProfiles).values({
        userId,
        displayName: data.displayName,
        bio: data.bio,
      }).onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          displayName: data.displayName,
          bio: data.bio,
          updatedAt: new Date(),
        },
      });
    }
    return this.getMe(userId);
  }

  async getByHandle(handle: string) {
    const db = getDb();
    const [user] = await db.select({
      id: users.id, username: users.username, createdAt: users.createdAt,
    }).from(users).where(eq(users.username, handle)).limit(1);
    if (!user) throw new NotFoundException('User not found');
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
    return { ...user, profile: profile ?? { displayName: null, bio: null } };
  }

  async deleteMe(userId: string) {
    const db = getDb();
    await db.execute(sql`UPDATE users SET status = 'deleted', deleted_at = NOW() WHERE id = ${userId}`);
    return { deleted: true };
  }
}
