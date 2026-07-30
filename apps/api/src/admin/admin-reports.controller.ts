import { Controller, Get, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { reports } from '@itchats/database/schema';
import { eq, desc, count } from 'drizzle-orm';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AdminRoleGuard } from './admin-role.guard';

@Controller('v1/admin/reports')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminReportsController {
  @Get()
  async listReports(@Query('status') status?: string, @Query('page') page = '1', @Query('limit') limit = '20') {
    const db = getDb();
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const where = status ? eq(reports.status, status) : undefined;

    const [rows, countResult] = await Promise.all([
      db.select().from(reports).where(where).orderBy(desc(reports.createdAt)).limit(parseInt(limit)).offset(offset),
      db.select({ cnt: count() }).from(reports).where(where),
    ]);

    const cnt = countResult[0]?.cnt ?? 0;
    return { reports: rows, total: Number(cnt), page: parseInt(page), limit: parseInt(limit) };
  }

  @Patch(':id')
  async resolveReport(@Param('id') id: string, @Body() body: { status: string }, @Req() req: any) {
    const db = getDb();
    const update: any = { status: body.status };
    if (body.status !== 'open') update.resolvedAt = new Date();

    const [updated] = await db.update(reports).set(update).where(eq(reports.id, id)).returning();
    return updated;
  }
}
