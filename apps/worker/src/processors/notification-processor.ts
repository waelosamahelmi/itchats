import { Job } from 'bullmq';
import { getDb } from '@itchats/database';
import { notifications, pushSubscriptions, conversationParticipants, conversations, messages } from '@itchats/database/schema';
import { eq, and } from 'drizzle-orm';
import { getConfig } from '@itchats/config';
import type { NotificationJob } from '../queues';

/**
 * Notification processor.
 *
 * 1. Persists notification in DB
 * 2. Sends push notification to all user's subscribed devices via Web Push
 * 3. Respects conversation mute settings for message-type notifications
 */
export async function notificationProcessor(job: Job<NotificationJob>) {
  const db = getDb();
  const config = getConfig();
  const { userId, type, title, body, data } = job.data;

  // For incoming_message or character_reply notifications, check mute
  if ((type === 'incoming_message' || type === 'character_reply') && data?.conversationId) {
    // Check if this conversation is muted for this user
    const [participant] = await db
      .select({ mutedUntil: conversationParticipants.mutedUntil })
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, data.conversationId),
          eq(conversationParticipants.userId, userId),
        ),
      )
      .limit(1);

    if (participant?.mutedUntil) {
      const mutedUntil = new Date(participant.mutedUntil);
      if (mutedUntil > new Date()) {
        // Still persist the notification silently, but don't send push
        const [n] = await db.insert(notifications).values({
          userId, type, title, body,
          dataJson: (data ?? {}),
          data: (data ?? {}),
          entityType: data?.entityType ?? null,
          entityId: data?.entityId ?? null,
        } as any).returning();
        return { success: true, notificationId: n!.id, pushSent: 0, muted: true };
      }
    }
  }

  // Persist notification
  const [n] = await db.insert(notifications).values({
    userId, type, title, body,
    dataJson: (data ?? {}),
    data: (data ?? {}),
    entityType: data?.entityType ?? null,
    entityId: data?.entityId ?? null,
  } as any).returning();

  // Send push notifications to subscribed devices
  if (config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY) {
    try {
      const subs = await db.select().from(pushSubscriptions)
        .where(and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.enabled, 'true' as any),
        ));

      if (subs.length > 0) {
        // Dynamic import web-push to avoid requiring it in non-push environments
        const webpush = await import('web-push').catch(() => null);
        if (webpush) {
          webpush.setVapidDetails(
            config.VAPID_SUBJECT ?? 'mailto:admin@itchats.ai',
            config.VAPID_PUBLIC_KEY,
            config.VAPID_PRIVATE_KEY,
          );

          // Include navigation data for deep linking
          const payload = JSON.stringify({
            title,
            body,
            type,
            data: data ?? {},
            notificationId: n!.id,
            // Deep link data for the service worker
            url: data?.url || `/notifications`,
          });

          const results = await Promise.allSettled(
            subs.map(sub =>
              webpush.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth,
                  },
                },
                payload,
              ).catch(async (err: any) => {
                // Remove invalid subscriptions (410 Gone, 404 Not Found)
                if (err.statusCode === 410 || err.statusCode === 404) {
                  await db.update(pushSubscriptions).set({ revokedAt: new Date(), enabled: 'false' } as any)
                    .where(eq(pushSubscriptions.id, sub.id));
                }
                throw err;
              })
            )
          );

          const succeeded = results.filter(r => r.status === 'fulfilled').length;
          const failed = results.filter(r => r.status === 'rejected').length;
          return { success: true, notificationId: n!.id, pushSent: succeeded, pushFailed: failed };
        }
      }
    } catch (err: any) {
      // Push failures shouldn't block notification persistence
      return { success: true, notificationId: n!.id, pushError: String(err.message).slice(0, 200) };
    }
  }

  return { success: true, notificationId: n!.id, pushSent: 0 };
}
