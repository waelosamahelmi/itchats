import { Job } from 'bullmq';
import { getDb } from '@itchats/database';
import { stories, refreshTokens, mediaAssets } from '@itchats/database/schema';
import { eq, lt, isNull, and, sql } from 'drizzle-orm';
import type { CleanupJob } from '../queues';

/**
 * Periodic cleanup tasks.
 * Runs daily via a scheduled repeatable job.
 */
export async function cleanupProcessor(job: Job<CleanupJob>) {
  const db = getDb();
  const { task } = job.data;

  switch (task) {
    case 'expired_stories': {
      const result = await db.update(stories)
        .set({ status: 'expired', updatedAt: new Date() } as any)
        .where(and(
          eq(stories.status, 'published'),
          lt(stories.publishedAt, new Date(Date.now() - 24 * 3600_000)),
        ));
      return { cleaned: 'stories', marked: result.rowCount ?? 0 };
    }

    case 'expired_tokens': {
      await db.delete(refreshTokens)
        .where(lt(refreshTokens.expiresAt, new Date()));
      return { cleaned: 'refresh_tokens' };
    }

    case 'orphaned_media': {
      // Mark soft-deleted media older than 30 days for permanent deletion
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);
      const result = await db.update(mediaAssets)
        .set({ deletedAt: new Date() } as any)
        .where(and(
          isNull(mediaAssets.ownerUserId),
          lt(mediaAssets.createdAt, thirtyDaysAgo),
        ));
      return { cleaned: 'orphaned_media', marked: result.rowCount ?? 0 };
    }

    case 'old_sessions': {
      // Clean up expired refresh tokens older than 7 days
      await db.delete(refreshTokens)
        .where(lt(refreshTokens.createdAt, new Date(Date.now() - 7 * 86400_000)));
      return { cleaned: 'old_sessions' };
    }

    default:
      return { skipped: true, reason: `unknown task: ${task}` };
  }
}


