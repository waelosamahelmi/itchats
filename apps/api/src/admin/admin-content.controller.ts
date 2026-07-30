import { Controller, Get, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { posts, postComments, users, characters } from '@itchats/database/schema';
import { eq, desc, count, sql, and, ilike } from 'drizzle-orm';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AdminRoleGuard } from './admin-role.guard';

@Controller('v1/admin/content')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminContentController {
  @Get('posts')
  async listPosts(@Query('search') search?: string, @Query('page') page = '1', @Query('limit') limit = '20') {
    const db = getDb();
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const where = search ? ilike(posts.content, `%${search}%`) : undefined;

    const [rows, countResult] = await Promise.all([
      db
        .select({
          id: posts.id,
          content: posts.content,
          mediaUrl: posts.mediaUrl,
          mediaType: posts.mediaType,
          visibility: posts.visibility,
          likeCount: posts.likeCount,
          commentCount: posts.commentCount,
          createdAt: posts.createdAt,
          authorUserId: posts.authorUserId,
          authorCharacterId: posts.authorCharacterId,
          authorUsername: users.username,
          characterName: characters.name,
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorUserId, users.id))
        .leftJoin(characters, eq(posts.authorCharacterId, characters.id))
        .where(where)
        .orderBy(desc(posts.createdAt))
        .limit(parseInt(limit))
        .offset(offset),
      db.select({ cnt: count() }).from(posts).where(where),
    ]);

    const cnt = countResult[0]?.cnt ?? 0;
    return { posts: rows, total: Number(cnt), page: parseInt(page), limit: parseInt(limit) };
  }

  @Get('comments')
  async listComments(@Query('search') search?: string, @Query('page') page = '1', @Query('limit') limit = '20') {
    const db = getDb();
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const where = search ? ilike(postComments.content, `%${search}%`) : undefined;

    const [rows, countResult] = await Promise.all([
      db
        .select({
          id: postComments.id,
          postId: postComments.postId,
          content: postComments.content,
          likeCount: postComments.likeCount,
          createdAt: postComments.createdAt,
          userId: postComments.userId,
          authorUsername: users.username,
          characterName: characters.name,
        })
        .from(postComments)
        .leftJoin(users, eq(postComments.userId, users.id))
        .leftJoin(characters, eq(postComments.characterId, characters.id))
        .where(where)
        .orderBy(desc(postComments.createdAt))
        .limit(parseInt(limit))
        .offset(offset),
      db.select({ cnt: count() }).from(postComments).where(where),
    ]);

    const cnt = countResult[0]?.cnt ?? 0;
    return { comments: rows, total: Number(cnt), page: parseInt(page), limit: parseInt(limit) };
  }

  @Delete('posts/:id')
  async deletePost(@Param('id') id: string) {
    const db = getDb();
    await db.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, id));
    return { deleted: true };
  }

  @Delete('comments/:id')
  async deleteComment(@Param('id') id: string) {
    const db = getDb();
    await db.update(postComments).set({ deletedAt: new Date() }).where(eq(postComments.id, id));
    return { deleted: true };
  }
}
