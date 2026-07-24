import { Injectable } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { notifications } from '@itchats/database/schema';
import { eq, desc } from 'drizzle-orm';

@Injectable()
export class NotificationsService {
  async create(userId: string, type: string, title: string, body: string, data?: Record<string, any>) {
    const db = getDb();
    const [n] = await db.insert(notifications).values({
      userId, type, title, body, data: data ?? {},
    }).returning();
    return n;
  }

  async list(userId: string, unreadOnly?: boolean) {
    const db = getDb();
    let q = db.select().from(notifications).where(eq(notifications.userId, userId));
    if (unreadOnly) q = q.where(eq(notifications.readAt, null as any));
    return q.orderBy(desc(notifications.createdAt)).limit(50);
  }

  async markRead(userId: string, notificationId: string) {
    const db = getDb();
    await db.update(notifications).set({ readAt: new Date() as any })
      .where(eq(notifications.id, notificationId));
    return { read: true };
  }

  async markAllRead(userId: string) {
    const db = getDb();
    await db.update(notifications).set({ readAt: new Date() as any })
      .where(eq(notifications.userId, userId));
    return { read: true };
  }

  async unreadCount(userId: string) {
    const db = getDb();
    const result = await db.select({ c: notifications.id })
      .from(notifications)
      .where(eq(notifications.userId, userId));
    return { count: result.length };
  }
}
