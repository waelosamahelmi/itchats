import { Controller, Get, Param, Patch, Delete, Query, Body, UseGuards, Req } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characters, users } from '@itchats/database/schema';
import { eq, ilike, sql, count, desc, and } from 'drizzle-orm';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AdminRoleGuard } from './admin-role.guard';

@Controller('v1/admin/characters')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminCharactersController {
  @Get()
  async listCharacters(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('visibility') visibility?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const db = getDb();
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const conditions: any[] = [];
    if (search) conditions.push(ilike(characters.name, `%${search}%`));
    if (status) conditions.push(sql`${characters.status} = ${status}`);
    if (visibility) conditions.push(sql`${characters.visibility} = ${visibility}`);
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db
        .select({
          id: characters.id,
          name: characters.name,
          handle: characters.handle,
          ownerUserId: characters.ownerUserId,
          visibility: characters.visibility,
          status: characters.status,
          avatarUrl: characters.avatarUrl,
          followerCount: characters.followerCount,
          characterScore: characters.characterScore,
          moderationStatus: characters.moderationStatus,
          createdAt: characters.createdAt,
          ownerUsername: users.username,
        })
        .from(characters)
        .leftJoin(users, eq(characters.ownerUserId, users.id))
        .where(where)
        .orderBy(desc(characters.createdAt))
        .limit(parseInt(limit))
        .offset(offset),
      db.select({ cnt: count() }).from(characters).where(where),
    ]);

    const cnt = countResult[0]?.cnt ?? 0;
    return { characters: rows, total: Number(cnt), page: parseInt(page), limit: parseInt(limit) };
  }

  @Patch(':id')
  async updateCharacter(@Param('id') id: string, @Body() body: { status?: string; visibility?: string; name?: string }, @Req() req: any) {
    const db = getDb();
    const update: any = { updatedAt: new Date() };
    if (body.status) update.status = body.status;
    if (body.visibility) update.visibility = body.visibility;
    if (body.name) update.name = body.name;

    const [updated] = await db.update(characters).set(update).where(eq(characters.id, id)).returning({ id: characters.id, status: characters.status, visibility: characters.visibility });
    return updated;
  }

  @Delete(':id')
  async deleteCharacter(@Param('id') id: string) {
    const db = getDb();
    await db.update(characters).set({ status: 'deleted', deletedAt: new Date() }).where(eq(characters.id, id));
    return { deleted: true };
  }
}
