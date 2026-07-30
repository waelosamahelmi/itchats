import { Controller, Get, UseGuards } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { users, characters, conversations, creditWallets, usageEvents, posts, reports } from '@itchats/database/schema';
import { count, eq, sql, gte } from 'drizzle-orm';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AdminRoleGuard } from './admin-role.guard';

@Controller('v1/admin/stats')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminDashboardController {
  @Get()
  async getStats() {
    const db = getDb();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(Date.now() - 7 * 86400000);

    const [totalUsersRes, activeCharsRes, activeConvsRes, totalCreditsRes, creditsTodayRes, openReportsRes,
      recentUsers, recentCharacters, recentReports, topCharacters, userGrowthData, revenueData
    ] = await Promise.all([
      db.select({ val: count() }).from(users),
      db.select({ val: count() }).from(characters).where(eq(characters.status, 'published')),
      db.select({ val: count() }).from(conversations).where(gte(conversations.lastMessageAt, weekAgo)),
      db.select({ val: sql<number>`COALESCE(SUM(${creditWallets.balance}), 0)` }).from(creditWallets),
      db.select({ val: sql<number>`COALESCE(SUM(${usageEvents.creditsDebited}), 0)` }).from(usageEvents).where(gte(usageEvents.createdAt, todayStart)),
      db.select({ val: count() }).from(reports).where(eq(reports.status, 'open')),
      db.select({ id: users.id, username: users.username, createdAt: users.createdAt })
        .from(users).orderBy(sql`${users.createdAt} DESC`).limit(10),
      db.select({ id: characters.id, name: characters.name, createdAt: characters.createdAt, avatarUrl: characters.avatarUrl })
        .from(characters).orderBy(sql`${characters.createdAt} DESC`).limit(10),
      db.select({ id: reports.id, entityType: reports.entityType, entityId: reports.entityId, reason: reports.reason, status: reports.status, createdAt: reports.createdAt }).from(reports).where(eq(reports.status, 'open')).orderBy(sql`${reports.createdAt} DESC`).limit(5),
      db.select({ id: characters.id, name: characters.name, followerCount: characters.followerCount, avatarUrl: characters.avatarUrl })
        .from(characters).orderBy(sql`${characters.followerCount} DESC`).limit(10),
      db.select({ date: sql<string>`DATE(${users.createdAt})`, cnt: count() })
        .from(users).where(gte(users.createdAt, new Date(Date.now() - 30 * 86400000)))
        .groupBy(sql`DATE(${users.createdAt})`).orderBy(sql`DATE(${users.createdAt})`),
      db.select({ date: sql<string>`DATE(${usageEvents.createdAt})`, total: sql<number>`COALESCE(SUM(${usageEvents.creditsDebited}), 0)` })
        .from(usageEvents).where(gte(usageEvents.createdAt, new Date(Date.now() - 7 * 86400000)))
        .groupBy(sql`DATE(${usageEvents.createdAt})`).orderBy(sql`DATE(${usageEvents.createdAt})`),
    ]);

    const fillDays = (data: any[], days: number, key: string) => {
      const result: any[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const dateStr = d.toISOString().slice(0, 10);
        const found = data.find((r: any) => r.date === dateStr);
        const entry: any = { date: dateStr };
        entry[key] = found ? (Number(found[key]) || 0) : 0;
        result.push(entry);
      }
      return result;
    };

    return {
      totalUsers: Number(totalUsersRes[0]?.val ?? 0),
      activeCharacters: Number(activeCharsRes[0]?.val ?? 0),
      activeConversations: Number(activeConvsRes[0]?.val ?? 0),
      totalCredits: Number(totalCreditsRes[0]?.val ?? 0),
      creditsUsedToday: Number(creditsTodayRes[0]?.val ?? 0),
      openReports: Number(openReportsRes[0]?.val ?? 0),
      recentUsers,
      recentCharacters,
      recentReports,
      topCharacters,
      userGrowth: fillDays(userGrowthData, 30, 'cnt'),
      revenue: fillDays(revenueData, 7, 'total'),
      systemHealth: { api: 'healthy', redis: 'healthy', db: 'healthy' },
    };
  }
}
