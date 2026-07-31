import { Injectable } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { notifications, pushSubscriptions } from '@itchats/database/schema';
import { and, desc, eq, isNull, count, sql, inArray } from 'drizzle-orm';

// Notification type constants
export const NOTIFICATION_TYPES = {
  MENTION: 'mention',
  CHARACTER_REPLY: 'character_reply',
  COMMENT_REPLY: 'comment_reply',
  POST_REACTION: 'post_reaction',
  COMMENT_REACTION: 'comment_reaction',
  NEW_FOLLOWER: 'new_follower',
  STORY_INTERACTION: 'story_interaction',
  INCOMING_MESSAGE: 'incoming_message',
  RELATIONSHIP_MILESTONE: 'relationship_milestone',
  BILLING_EVENT: 'billing_event',
  MODERATION_EVENT: 'moderation_event',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actorUserId?: string | null;
  actorCharacterId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  /**
   * Create a notification in the database.
   * Use the worker notification queue for async creation in high-throughput paths.
   */
  async create(input: CreateNotificationInput) {
    const db = getDb();
    const [n] = await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      actorUserId: input.actorUserId ?? null,
      actorCharacterId: input.actorCharacterId ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      title: input.title,
      body: input.body,
      dataJson: input.data ?? {},
      data: input.data ?? {},
    } as any).returning();
    return n;
  }

  /**
   * List notifications for a user, optionally filtered to unread only.
   */
  async list(userId: string, page = 1, limit = 50, unreadOnly?: boolean) {
    const db = getDb();
    const conditions = unreadOnly
      ? [eq(notifications.userId, userId), isNull(notifications.readAt)]
      : [eq(notifications.userId, userId)];

    const results = await db.select().from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(Math.min(limit, 100))
      .offset((page - 1) * Math.min(limit, 100));

    return results;
  }

  /**
   * Mark a single notification as read.
   */
  async markRead(userId: string, notificationId: string) {
    const db = getDb();
    await db.update(notifications).set({ readAt: new Date() } as any)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
    return { read: true };
  }

  /**
   * Mark all notifications for a user as read.
   */
  async markAllRead(userId: string) {
    const db = getDb();
    await db.update(notifications).set({ readAt: new Date() } as any)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return { read: true };
  }

  /**
   * Get unread notification count for a user.
   */
  async unreadCount(userId: string) {
    const db = getDb();
    const [result] = await db.select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return { count: result?.count ?? 0 };
  }

  // ── Push Subscriptions ──

  /**
   * Subscribe a device for push notifications.
   */
  async subscribePush(
    userId: string,
    endpoint: string,
    p256dh: string,
    auth: string,
    userAgent?: string,
  ) {
    const db = getDb();

    // Check if this endpoint already exists
    const [existing] = await db.select().from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint))
      .limit(1);

    if (existing) {
      // Update the existing subscription (re-subscribe)
      await db.update(pushSubscriptions).set({
        userId,
        p256dh,
        auth,
        userAgent: userAgent ?? existing.userAgent ?? null,
        enabled: 'true',
        lastUsedAt: new Date(),
        revokedAt: null,
      } as any).where(eq(pushSubscriptions.id, existing.id));
      return { subscriptionId: existing.id, updated: true };
    }

    const [sub] = await db.insert(pushSubscriptions).values({
      userId,
      endpoint,
      p256dh,
      auth,
      userAgent: userAgent ?? null,
      lastUsedAt: new Date(),
    } as any).returning();

    return { subscriptionId: sub!.id, created: true };
  }

  /**
   * Unsubscribe a push subscription by ID.
   */
  async unsubscribePush(subscriptionId: string) {
    const db = getDb();
    await db.update(pushSubscriptions).set({ revokedAt: new Date(), enabled: 'false' } as any)
      .where(eq(pushSubscriptions.id, subscriptionId));
    return { deleted: true };
  }

  /**
   * Unsubscribe a push subscription by endpoint (for client-side cleanup).
   */
  async unsubscribePushByEndpoint(userId: string, endpoint: string) {
    const db = getDb();
    await db.update(pushSubscriptions).set({ revokedAt: new Date(), enabled: 'false' } as any)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
    return { deleted: true };
  }

  /**
   * Get all active push subscriptions for a user.
   */
  async getUserPushSubscriptions(userId: string) {
    const db = getDb();
    return db.select().from(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.enabled, 'true' as any),
      ));
  }
}
