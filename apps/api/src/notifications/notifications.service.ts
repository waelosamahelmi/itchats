import { Injectable } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { notifications, pushSubscriptions } from '@itchats/database/schema';
import { and, desc, eq, isNull, count, sql } from 'drizzle-orm';

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
    const [result] = await db.select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return { count: result?.count ?? 0 };
  }

  // ── Push Subscriptions ──

  async subscribePush(userId: string, endpoint: string, p256dh: string, auth: string) {
    const db = getDb();

    // Check if this endpoint already exists
    const [existing] = await db.select().from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint))
      .limit(1);

    if (existing) {
      // Update the existing subscription
      await db.update(pushSubscriptions).set({
        userId, p256dh, auth, enabled: 'true',
      } as any).where(eq(pushSubscriptions.id, existing.id));
      return { subscriptionId: existing.id, updated: true };
    }

    const [sub] = await db.insert(pushSubscriptions).values({
      userId, endpoint, p256dh, auth,
    }).returning();

    return { subscriptionId: sub!.id, created: true };
  }

  async unsubscribePush(subscriptionId: string) {
    const db = getDb();
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscriptionId));
    return { deleted: true };
  }

  async getUserPushSubscriptions(userId: string) {
    const db = getDb();
    return db.select().from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.enabled, 'true' as any)));
  }
}
