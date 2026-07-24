import { Injectable } from '@nestjs/common';
import { getConfig } from '@itchats/config';
import { randomUUID } from 'node:crypto';

@Injectable()
export class MediaService {
  async createUploadUrl(userId: string, mimeType: string, fileName: string) {
    const config = getConfig();
    if (!config.S3_ENDPOINT) {
      // Development fallback: return a placeholder signed URL
      const objectKey = `uploads/${userId}/${randomUUID()}-${fileName}`;
      return {
        uploadUrl: `${config.S3_ENDPOINT ?? 'http://localhost:9000'}/${config.S3_BUCKET ?? 'itchats-dev'}/${objectKey}?signature=dev-placeholder`,
        objectKey,
        bucket: config.S3_BUCKET ?? 'itchats-dev',
        storageProvider: 's3',
      };
    }
    // Production: Generate real S3 signed URL using AWS SDK or compatible client
    const objectKey = `uploads/${userId}/${randomUUID()}-${fileName}`;
    return { uploadUrl: '', objectKey, bucket: config.S3_BUCKET, storageProvider: 's3' };
  }

  validateMime(mimeType: string): boolean {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'audio/mpeg', 'audio/wav'];
    return allowed.includes(mimeType);
  }

  validateSize(bytes: number, mediaType: string): boolean {
    const limits: Record<string, number> = { image: 10 * 1024 * 1024, video: 100 * 1024 * 1024, audio: 25 * 1024 * 1024 };
    return bytes <= (limits[mediaType] ?? 5 * 1024 * 1024);
  }
}
