import { Job } from 'bullmq';
import { getDb } from '@itchats/database';
import { notifications, pushSubscriptions } from '@itchats/database/schema';
import { eq } from 'drizzle-orm';
import { getConfig } from '@itchats/config';
import type { NotificationJob } from '../queues';

/**
 * Notification processor.
 *
 * 1. Persists notification in DB
 * 2. Sends push notification to all user's subscribed devices via Web Push
 */
export async function notificationProcessor(job: Job<NotificationJob>) {
  const db = getDb();
  const config = getConfig();
  const { userId, type, title, body, data } = job.data;

  // Persist notification
  const [n] = await db.insert(notifications).values({
    userId, type, title, body, data: data ?? {},
  }).returning();

  // Send push notifications to subscribed devices
  if (config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY) {
    try {
      const subs = await db.select().from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userId));

      if (subs.length > 0) {
        // Dynamic import web-push to avoid requiring it in non-push environments
        const webpush = await import('web-push').catch(() => null);
        if (webpush) {
          webpush.setVapidDetails(
            config.VAPID_SUBJECT ?? 'mailto:admin@itchats.ai',
            config.VAPID_PUBLIC_KEY,
            config.VAPID_PRIVATE_KEY,
          );

          const payload = JSON.stringify({ title, body, type, data, notificationId: n!.id });

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
                // Remove invalid subscriptions (410 Gone)
                if (err.statusCode === 410 || err.statusCode === 404) {
                  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
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
