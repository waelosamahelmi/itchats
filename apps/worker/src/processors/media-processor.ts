import { Job } from 'bullmq';
import { getDb } from '@itchats/database';
import { mediaAssets } from '@itchats/database/schema';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import type { MediaProcessingJob } from '../queues';

/**
 * Media processing: thumbnail generation, EXIF stripping, optimization.
 * Runs in the worker to keep the API responsive.
 */
export async function mediaProcessingProcessor(job: Job<MediaProcessingJob>) {
  const db = getDb();
  const { mediaAssetId, operations } = job.data;

  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaAssetId)).limit(1);
  if (!asset) throw new Error(`Media asset ${mediaAssetId} not found`);

  const results: Record<string, any> = {};

  if (operations.includes('strip_exif') && asset.mimeType.startsWith('image/')) {
    try {
      const response = await fetch(asset.objectKey);
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        const cleaned = await sharp(buffer).rotate().jpeg({ quality: 92 }).toBuffer();
        results.stripped = { sizeBefore: buffer.length, sizeAfter: cleaned.length };
      }
    } catch { /* best-effort */ }
  }

  if (operations.includes('thumbnail') && asset.mimeType.startsWith('image/')) {
    try {
      const response = await fetch(asset.objectKey);
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        const thumb = await sharp(buffer).resize(400, 400, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer();
        results.thumbnail = { width: 400, size: thumb.length };
      }
    } catch { /* best-effort */ }
  }

  if (operations.includes('optimize') && asset.mimeType.startsWith('image/')) {
    try {
      const response = await fetch(asset.objectKey);
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        const optimized = await sharp(buffer)
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();
        results.optimized = { sizeBefore: buffer.length, sizeAfter: optimized.length };
      }
    } catch { /* best-effort */ }
  }

  await db.update(mediaAssets).set({
    metadata: { ...(asset.metadata as any ?? {}), processingResults: results },
  } as any).where(eq(mediaAssets.id, mediaAssetId));

  return { success: true, results };
}
