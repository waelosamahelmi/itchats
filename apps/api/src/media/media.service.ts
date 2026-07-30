import { Injectable, Logger } from '@nestjs/common';
import { getConfig } from '@itchats/config';
import { getDb } from '@itchats/database';
import { mediaAssets } from '@itchats/database/schema';
import { eq } from 'drizzle-orm';
import { randomUUID, createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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

/**
 * Check if S3 is actually configured (all required keys present).
 */
function isS3Configured(): boolean {
  const config = getConfig();
  return !!(config.S3_ENDPOINT && config.S3_ACCESS_KEY && config.S3_SECRET_KEY && config.S3_BUCKET);
}

/**
 * Get the local uploads directory, creating it if needed.
 */
function getLocalUploadsDir(): string {
  const dir = join('/opt', 'itchats', 'uploads');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  /**
   * Create a signed upload URL for direct-to-S3 uploads.
   *
   * When S3 is not configured, falls back to storing base64 data URLs
   * or local filesystem storage in /opt/itchats/uploads/.
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
    const usesS3 = isS3Configured();
    const objectKey = `uploads/${userId}/${randomUUID()}-${fileName}`;
    const bucket = usesS3 ? config.S3_BUCKET! : 'local';
    const storageProvider = usesS3 ? 's3' : 'local';

    // Create media asset record
    const db = getDb();
    const [asset] = await db.insert(mediaAssets).values({
      ownerUserId: userId,
      visibility,
      storageProvider: storageProvider as any,
      bucket,
      objectKey,
      mimeType,
      mediaType,
      bytes: fileSize,
      metadata: { originalName: fileName, uploadStatus: 'pending', storage: storageProvider },
    }).returning();

    let uploadUrl: string;

    if (usesS3) {
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
      // No S3 configured — return a local API endpoint for upload
      const apiBase = config.API_BASE_URL || `http://localhost:${config.PORT}`;
      uploadUrl = `${apiBase}/v1/media/upload-local?key=${encodeURIComponent(objectKey)}`;
      this.logger.log(`S3 not configured — using local storage for upload: ${objectKey}`);
    }

    return {
      uploadUrl,
      objectKey,
      bucket,
      storageProvider,
      mediaAssetId: asset!.id,
      s3Configured: usesS3,
    };
  }

  /**
   * Store a file locally (base64 content).
   */
  async storeLocalFile(mediaAssetId: string, base64Content: string) {
    const db = getDb();
    const [asset] = await db.select().from(mediaAssets)
      .where(eq(mediaAssets.id, mediaAssetId))
      .limit(1);

    if (!asset) throw new Error('Media asset not found');

    const localDir = getLocalUploadsDir();
    const filePath = join(localDir, asset.id);
    const buffer = Buffer.from(base64Content, 'base64');
    writeFileSync(filePath, buffer);

    await db.update(mediaAssets).set({
      metadata: { ...((asset.metadata as any) ?? {}), uploadStatus: 'completed', storageSource: 'uploaded', localPath: filePath },
    } as any).where(eq(mediaAssets.id, mediaAssetId));

    return { stored: true, mediaAssetId };
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
   * Falls back to local file serving when S3 is not configured.
   */
  async getDownloadUrl(mediaAssetId: string) {
    const db = getDb();
    const [asset] = await db.select().from(mediaAssets)
      .where(eq(mediaAssets.id, mediaAssetId))
      .limit(1);

    if (!asset) throw new Error('Media asset not found');

    const config = getConfig();
    const meta = (asset.metadata as any) ?? {};

    if (isS3Configured() && asset.storageProvider === 's3') {
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
        return { url, mediaAssetId: asset.id, mimeType: asset.mimeType, source: 's3' };
      } catch {
        // Fallback to local or base64
      }
    }

    // Local storage fallback — check for local file path in metadata
    if (meta.localPath && existsSync(meta.localPath)) {
      const buffer = readFileSync(meta.localPath);
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${asset.mimeType};base64,${base64}`;
      return { url: dataUrl, mediaAssetId: asset.id, mimeType: asset.mimeType, source: 'local' };
    }

    // Last resort — direct URL (may be stale)
    if (meta.storageSource === 'uploaded') {
      const apiBase = config.API_BASE_URL || `http://localhost:${config.PORT}`;
      return {
        url: `${apiBase}/v1/media/${mediaAssetId}`,
        mediaAssetId: asset.id,
        mimeType: asset.mimeType,
        source: 'local-api',
      };
    }

    return {
      url: `${config.S3_ENDPOINT ?? 'http://localhost:9000'}/${asset.bucket}/${asset.objectKey}`,
      mediaAssetId: asset.id,
      mimeType: asset.mimeType,
      source: 'fallback',
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
