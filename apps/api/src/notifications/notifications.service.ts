import { Injectable } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { notifications } from '@itchats/database/schema';
import { and, desc, eq, isNull } from 'drizzle-orm';

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
    return db.select().from(notifications)
      .where(unreadOnly
        ? and(eq(notifications.userId, userId), isNull(notifications.readAt))
        : eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async markRead(userId: string, notificationId: string) {
    const db = getDb();
    await db.update(notifications).set({ readAt: new Date() as any })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
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
