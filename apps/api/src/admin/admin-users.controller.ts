import { Controller, Get, Param, Patch, Delete, Query, Body, UseGuards, Req } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { users, userProfiles, creditWallets, characters } from '@itchats/database/schema';
import { eq, ilike, sql, count, desc } from 'drizzle-orm';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AdminRoleGuard } from './admin-role.guard';

@Controller('v1/admin/users')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminUsersController {
  @Get()
  async listUsers(@Query('search') search?: string, @Query('page') page = '1', @Query('limit') limit = '20') {
    const db = getDb();
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const where = search
      ? ilike(users.username, `%${search}%`)
      : undefined;

    const [rows, countResult] = await Promise.all([
      db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          role: users.role,
          status: users.status,
          createdAt: users.createdAt,
          lastLoginAt: users.lastLoginAt,
          deletedAt: users.deletedAt,
          displayName: userProfiles.displayName,
          avatarMediaId: userProfiles.avatarMediaId,
          score: userProfiles.score,
        })
        .from(users)
        .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(parseInt(limit))
        .offset(offset),
      db.select({ cnt: count() }).from(users).where(where),
    ]);

    const cnt = countResult[0]?.cnt ?? 0;

    const ids = rows.map(r => r.id);
    if (ids.length > 0) {
      const [walletRows, charCounts] = await Promise.all([
        db.select({ userId: creditWallets.userId, balance: creditWallets.balance })
          .from(creditWallets)
          .where(sql`${creditWallets.userId} IN ${ids}`),
        db.select({ ownerUserId: characters.ownerUserId, cnt: count() })
          .from(characters)
          .where(sql`${characters.ownerUserId} IN ${ids}`)
          .groupBy(characters.ownerUserId),
      ]);
      const walletMap = new Map(walletRows.map(w => [w.userId, w.balance]));
      const charMap = new Map(charCounts.map(c => [c.ownerUserId, c.cnt]));
      const enriched = rows.map(r => ({
        ...r,
        credits: walletMap.get(r.id) ?? 0,
        characterCount: charMap.get(r.id) ?? 0,
      }));
      return { users: enriched, total: Number(cnt), page: parseInt(page), limit: parseInt(limit) };
    }

    return { users: rows.map(r => ({ ...r, credits: 0, characterCount: 0 })), total: Number(cnt), page: parseInt(page), limit: parseInt(limit) };
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    const db = getDb();
    const [row] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        status: users.status,
        locale: users.locale,
        timezone: users.timezone,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastLoginAt: users.lastLoginAt,
        deletedAt: users.deletedAt,
        displayName: userProfiles.displayName,
        bio: userProfiles.bio,
        avatarMediaId: userProfiles.avatarMediaId,
        score: userProfiles.score,
        about: userProfiles.about,
        website: userProfiles.website,
        location: userProfiles.location,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(eq(users.id, id))
      .limit(1);
    if (!row) return { error: 'User not found' };

    const [wallet, charCount] = await Promise.all([
      db.select({ balance: creditWallets.balance }).from(creditWallets).where(eq(creditWallets.userId, id)).limit(1),
      db.select({ cnt: count() }).from(characters).where(eq(characters.ownerUserId, id)),
    ]);
    return { ...row, credits: wallet?.[0]?.balance ?? 0, characterCount: Number(charCount[0]?.cnt ?? 0) };
  }

  @Patch(':id')
  async updateUser(@Param('id') id: string, @Body() body: { role?: string; status?: string }, @Req() req: any) {
    const db = getDb();
    const update: any = { updatedAt: new Date() };
    if (body.role) update.role = body.role;
    if (body.status) update.status = body.status;

    const [updated] = await db.update(users).set(update).where(eq(users.id, id)).returning({ id: users.id, role: users.role, status: users.status });
    return updated;
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string, @Req() req: any) {
    const db = getDb();
    await db.update(users).set({ status: 'deleted', deletedAt: new Date() }).where(eq(users.id, id));
    return { deleted: true };
  }
}
