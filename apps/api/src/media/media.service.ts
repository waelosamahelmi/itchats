import { Injectable, Logger } from '@nestjs/common';
import { getConfig } from '@itchats/config';
import { getDb } from '@itchats/database';
import { mediaAssets } from '@itchats/database/schema';
import { eq } from 'drizzle-orm';
import { randomUUID, createHash } from 'node:crypto';

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4',
];

const SIZE_LIMITS: Record<string, number> = {
  image: 10 * 1024 * 1024,   // 10 MB
  video: 100 * 1024 * 1024,  // 100 MB
  audio: 25 * 1024 * 1024,   // 25 MB
};

function getMediaType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'other';
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  /**
   * Create a signed upload URL for direct-to-S3 uploads.
   *
   * In development, returns a local placeholder URL.
   * In production, generates a presigned PUT URL via the S3 SDK.
   */
  async createUploadUrl(
    userId: string,
    mimeType: string,
    fileName: string,
    fileSize: number,
    visibility: 'private' | 'public' = 'private',
  ) {
    if (!this.validateMime(mimeType)) {
      throw new Error(`Unsupported MIME type: ${mimeType}`);
    }

    const mediaType = getMediaType(mimeType);
    if (!this.validateSize(fileSize, mediaType)) {
      throw new Error(`File too large: ${fileSize} bytes exceeds limit for ${mediaType}`);
    }

    const config = getConfig();
    const objectKey = `uploads/${userId}/${randomUUID()}-${fileName}`;
    const bucket = config.S3_BUCKET ?? 'itchats-dev';

    // Create media asset record
    const db = getDb();
    const [asset] = await db.insert(mediaAssets).values({
      ownerUserId: userId,
      visibility,
      storageProvider: 's3',
      bucket,
      objectKey,
      mimeType,
      mediaType,
      bytes: fileSize,
      metadata: { originalName: fileName, uploadStatus: 'pending' },
    }).returning();

    let uploadUrl: string;

    if (config.S3_ENDPOINT && config.S3_ACCESS_KEY && config.S3_SECRET_KEY) {
      try {
        const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

        const s3 = new S3Client({
          endpoint: config.S3_ENDPOINT,
          region: config.S3_REGION ?? 'us-east-1',
          credentials: {
            accessKeyId: config.S3_ACCESS_KEY,
            secretAccessKey: config.S3_SECRET_KEY,
          },
          forcePathStyle: true,
        });

        uploadUrl = await getSignedUrl(
          s3,
          new PutObjectCommand({
            Bucket: bucket,
            Key: objectKey,
            ContentType: mimeType,
          }),
          { expiresIn: 600 },
        );
      } catch (err: any) {
        this.logger.warn(`S3 presigned URL generation failed: ${err.message}`);
        uploadUrl = `${config.S3_ENDPOINT}/${bucket}/${objectKey}?signature=dev-fallback`;
      }
    } else {
      uploadUrl = `${config.S3_ENDPOINT ?? 'http://localhost:9000'}/${bucket}/${objectKey}?signature=dev-placeholder`;
    }

    return {
      uploadUrl,
      objectKey,
      bucket,
      storageProvider: 's3',
      mediaAssetId: asset!.id,
    };
  }

  /**
   * Confirm that an upload completed successfully.
   * Updates the media asset status and optionally computes a checksum.
   */
  async confirmUpload(mediaAssetId: string, sha256?: string) {
    const db = getDb();
    const updates: Record<string, any> = {};
    if (sha256) updates.sha256 = sha256;

    await db.update(mediaAssets).set({
      ...updates,
      metadata: { uploadStatus: 'completed' },
    } as any).where(eq(mediaAssets.id, mediaAssetId));

    return { confirmed: true, mediaAssetId };
  }

  /**
   * Create a voice-note upload URL specifically for voice messages.
   */
  async createVoiceNoteUploadUrl(userId: string, fileName: string, fileSize: number) {
    return this.createUploadUrl(
      userId,
      'audio/webm', // Default for MediaRecorder
      fileName || `voice-note-${Date.now()}.webm`,
      fileSize,
      'private',
    );
  }

  /**
   * Get a download/presigned URL for a media asset.
   */
  async getDownloadUrl(mediaAssetId: string) {
    const db = getDb();
    const [asset] = await db.select().from(mediaAssets)
      .where(eq(mediaAssets.id, mediaAssetId))
      .limit(1);

    if (!asset) throw new Error('Media asset not found');

    const config = getConfig();

    if (config.S3_ENDPOINT && config.S3_ACCESS_KEY && config.S3_SECRET_KEY) {
      try {
        const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

        const s3 = new S3Client({
          endpoint: config.S3_ENDPOINT,
          region: config.S3_REGION ?? 'us-east-1',
          credentials: {
            accessKeyId: config.S3_ACCESS_KEY,
            secretAccessKey: config.S3_SECRET_KEY,
          },
          forcePathStyle: true,
        });

        const url = await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: asset.bucket, Key: asset.objectKey }),
          { expiresIn: 3600 },
        );
        return { url, mediaAssetId: asset.id, mimeType: asset.mimeType };
      } catch {
        // Fallback to direct URL
      }
    }

    return {
      url: `${config.S3_ENDPOINT ?? 'http://localhost:9000'}/${asset.bucket}/${asset.objectKey}`,
      mediaAssetId: asset.id,
      mimeType: asset.mimeType,
    };
  }

  validateMime(mimeType: string): boolean {
    return ALLOWED_MIME_TYPES.includes(mimeType);
  }

  validateSize(bytes: number, mediaType: string): boolean {
    const limit = SIZE_LIMITS[mediaType] ?? 5 * 1024 * 1024;
    return bytes > 0 && bytes <= limit;
  }
}
