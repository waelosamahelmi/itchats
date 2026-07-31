import { Controller, Post, Body, Req, UseGuards, Param, Get, Res, HttpCode, HttpStatus, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { z } from 'zod';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const UploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive(),
  visibility: z.enum(['private', 'public']).default('private'),
});

const ConfirmUploadSchema = z.object({
  mediaAssetId: z.string().uuid(),
  sha256: z.string().optional(),
});

const LocalUploadSchema = z.object({
  mediaAssetId: z.string().uuid(),
  base64Content: z.string().min(1),
});

@Controller('v1/media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  private readonly logger = new Logger(MediaController.name);
  constructor(private readonly media: MediaService) {}

  @Post('upload-url')
  async getUploadUrl(@Body() body: unknown, @Req() req: any) {
    const input = UploadUrlSchema.parse(body);
    return this.media.createUploadUrl(
      req.user.userId,
      input.contentType,
      input.fileName,
      input.fileSize,
      input.visibility,
    );
  }

  @Post('voice-note-upload-url')
  async getVoiceNoteUploadUrl(@Body() body: any, @Req() req: any) {
    try {
      // Validate input manually for robustness
      const fileSize = typeof body?.fileSize === 'number' ? body.fileSize : Number(body?.fileSize);
      if (!fileSize || fileSize <= 0 || isNaN(fileSize)) {
        throw new BadRequestException('fileSize must be a positive number');
      }
      const fileName = typeof body?.fileName === 'string' && body.fileName.length > 0
        ? body.fileName
        : `voice-note-${Date.now()}.webm`;

      this.logger.log(`Voice note upload requested: userId=${req.user?.userId}, size=${fileSize}, fileName=${fileName}`);

      return await this.media.createVoiceNoteUploadUrl(
        req.user.userId,
        fileName,
        fileSize,
      );
    } catch (err: any) {
      this.logger.error(`Voice note upload URL failed: ${err.message}`, err.stack);
      if (err.status) throw err; // re-throw NestJS HTTP exceptions
      throw new InternalServerErrorException(err.message || 'Failed to create voice note upload URL');
    }
  }

  @Post('confirm-upload')
  async confirmUpload(@Body() body: unknown) {
    const input = ConfirmUploadSchema.parse(body);
    return this.media.confirmUpload(input.mediaAssetId, input.sha256);
  }

  /**
   * Store a file locally when S3 is not configured.
   */
  @Post('upload-local')
  @HttpCode(HttpStatus.OK)
  async uploadLocal(@Body() body: unknown) {
    const input = LocalUploadSchema.parse(body);
    return this.media.storeLocalFile(input.mediaAssetId, input.base64Content);
  }

  @Get(':mediaAssetId/download-url')
  async getDownloadUrl(@Param('mediaAssetId') mediaAssetId: string) {
    return this.media.getDownloadUrl(mediaAssetId);
  }

  /**
   * Serve a locally stored media file by its asset ID.
   */
  @Get(':mediaAssetId')
  async serveLocal(@Param('mediaAssetId') mediaAssetId: string, @Res({ passthrough: true }) res: any) {
    const localPath = join('/opt', 'itchats', 'uploads', mediaAssetId);
    if (!existsSync(localPath)) {
      res.status(404);
      return { error: 'Media not found' };
    }
    const buffer = readFileSync(localPath);
    const { getDb } = await import('@itchats/database');
    const { mediaAssets } = await import('@itchats/database/schema');
    const { eq } = await import('drizzle-orm');
    const db = getDb();
    const [asset] = await db.select({ mimeType: mediaAssets.mimeType }).from(mediaAssets).where(eq(mediaAssets.id, mediaAssetId)).limit(1);
    res.header('Content-Type', asset?.mimeType ?? 'application/octet-stream');
    res.header('Cache-Control', 'public, max-age=86400');
    return buffer;
  }

  // ── Voice Note Upload (multipart) ──
  @Post('voice-notes')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async uploadVoiceNote(@Req() req: any) {
    try {
      // Fastify multipart: req.body() returns the parsed multipart data
      const data = await (req as any).body();
      const file = data?.audio || data?.file;
      const characterId = data?.characterId?.value || data?.characterId;
      const conversationId = data?.conversationId?.value || data?.conversationId;

      if (!file) {
        throw new BadRequestException('No audio file provided. Use field name "audio".');
      }

      const buffer = await file.toBuffer();
      const mimeType = file.mimetype || 'audio/webm';
      const fileName = file.filename || `voice-note-${Date.now()}.webm`;
      const fileSize = buffer.length;

      // Validate
      const allowedTypes = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/opus'];
      if (!allowedTypes.includes(mimeType) && !mimeType.startsWith('audio/')) {
        throw new BadRequestException(`Unsupported audio type: ${mimeType}. Allowed: ${allowedTypes.join(', ')}`);
      }
      if (fileSize > 25 * 1024 * 1024) {
        throw new BadRequestException('Audio file too large. Maximum 25MB.');
      }

      // Save locally
      const localDir = join('/opt', 'itchats', 'uploads');
      if (!existsSync(localDir)) mkdirSync(localDir, { recursive: true });

      const localFileId = randomUUID();
      const ext = mimeType.split('/')[1]?.split(';')[0] || 'webm';
      const localPath = join(localDir, `${localFileId}.${ext}`);
      writeFileSync(localPath, buffer);

      // Create media asset record
      const { getDb } = await import('@itchats/database');
      const { mediaAssets } = await import('@itchats/database/schema');
      const db = getDb();

      const [asset] = await db.insert(mediaAssets).values({
        ownerUserId: req.user.userId,
        visibility: 'private',
        storageProvider: 'local',
        bucket: 'local',
        objectKey: `voice-notes/${localFileId}.${ext}`,
        mimeType,
        mediaType: 'audio',
        bytes: fileSize,
        metadata: {
          originalName: fileName,
          uploadStatus: 'completed',
          storageSource: 'uploaded',
          localPath,
        },
      }).returning();

      const config = (await import('@itchats/config')).getConfig();
      const apiBase = config.API_BASE_URL || `http://localhost:${config.PORT}`;
      const playbackUrl = `${apiBase}/v1/media/${asset!.id}`;

      // Convert duration if available from metadata
      const durationMs = data?.durationMs?.value ? parseInt(String(data.durationMs.value), 10) || 0 : 0;

      return {
        mediaAssetId: asset!.id,
        playbackUrl,
        durationMs,
        mimeType,
        transcription: null,
        message: 'Voice note uploaded successfully',
      };
    } catch (err: any) {
      this.logger.error(`Voice note upload failed: ${err.message}`);
      if (err.status) throw err;
      throw new InternalServerErrorException(err.message || 'Voice note upload failed');
    }
  }
}
