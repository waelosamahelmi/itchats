import { Controller, Post, Body, Req, UseGuards, Param, Get, Res, HttpCode, HttpStatus, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { MediaService } from './media.service';
import { AiService } from '../ai/ai.service';
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
export class MediaController {
  private readonly logger = new Logger(MediaController.name);
  constructor(
    private readonly media: MediaService,
    private readonly aiService: AiService,
  ) {}

  @Post('upload-url')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  async confirmUpload(@Body() body: unknown) {
    const input = ConfirmUploadSchema.parse(body);
    return this.media.confirmUpload(input.mediaAssetId, input.sha256);
  }

  /**
   * Store a file locally when S3 is not configured.
   */
  @Post('upload-local')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async uploadLocal(@Body() body: unknown) {
    const input = LocalUploadSchema.parse(body);
    return this.media.storeLocalFile(input.mediaAssetId, input.base64Content);
  }

  @Get(':mediaAssetId/download-url')
  @UseGuards(JwtAuthGuard)
  async getDownloadUrl(@Param('mediaAssetId') mediaAssetId: string) {
    return this.media.getDownloadUrl(mediaAssetId);
  }

  /**
   * Serve a locally stored media file by its asset ID.
   * Public route (no JWT guard): media asset IDs are unguessable UUIDs and this
   * URL must be loadable by <audio>/<img> elements, which cannot send headers.
   */
  @Get(':mediaAssetId')
  async serveLocal(@Param('mediaAssetId') mediaAssetId: string, @Res({ passthrough: true }) res: any) {
    const { getDb } = await import('@itchats/database');
    const { mediaAssets } = await import('@itchats/database/schema');
    const { eq } = await import('drizzle-orm');
    const db = getDb();
    const [asset] = await db.select({ mimeType: mediaAssets.mimeType, metadata: mediaAssets.metadata })
      .from(mediaAssets).where(eq(mediaAssets.id, mediaAssetId)).limit(1);

    // Prefer the exact path recorded at upload time; fall back to the legacy
    // convention of storing the file under the bare asset ID.
    const meta = (asset?.metadata as any) ?? {};
    const candidates = [meta.localPath, join('/opt', 'itchats', 'uploads', mediaAssetId)].filter(Boolean) as string[];
    const localPath = candidates.find((path) => existsSync(path));
    if (!localPath) {
      res.status(404);
      return { error: 'Media not found' };
    }
    const buffer = readFileSync(localPath);
    res.header('Content-Type', asset?.mimeType ?? 'application/octet-stream');
    res.header('Cache-Control', 'public, max-age=86400');
    res.header('Accept-Ranges', 'none');
    return buffer;
  }

  // ── Voice Note Upload (multipart) ──
  // Accepts field "audio" (file) plus optional "characterId", "conversationId",
  // "durationMs" fields. Stores the file durably, transcribes it, and persists a
  // `voice_note` message row so the note survives refresh. Returns
  // { mediaAssetId, playbackUrl, durationMs, mimeType, transcription, messageId, conversationId }.
  @Post('voice-notes')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async uploadVoiceNote(@Req() req: any) {
    try {
      // @fastify/multipart with attachFieldsToBody: parsed parts live on req.body
      const data = (req as any).body ?? {};
      const file = data?.audio || data?.file;
      const fieldValue = (field: any): string | undefined => {
        if (field == null) return undefined;
        if (typeof field === 'string') return field;
        if (typeof field.value === 'string') return field.value;
        return undefined;
      };
      const characterId = fieldValue(data?.characterId);
      const conversationId = fieldValue(data?.conversationId);
      const durationMs = parseInt(fieldValue(data?.durationMs) ?? '', 10) || 0;

      if (!file || typeof file.toBuffer !== 'function') {
        throw new BadRequestException('No audio file provided. Use field name "audio".');
      }

      const buffer: Buffer = await file.toBuffer();
      const mimeType: string = (file.mimetype || 'audio/webm').split(';')[0]!.trim();
      const fileName = file.filename || `voice-note-${Date.now()}.webm`;
      const fileSize = buffer.length;

      // Validate
      if (!mimeType.startsWith('audio/') && mimeType !== 'video/webm') {
        throw new BadRequestException(`Unsupported audio type: ${mimeType}.`);
      }
      if (fileSize === 0) {
        throw new BadRequestException('Audio file is empty.');
      }
      if (fileSize > 25 * 1024 * 1024) {
        throw new BadRequestException('Audio file too large. Maximum 25MB.');
      }

      // Save locally under the asset ID so GET /v1/media/:id resolves it directly
      const localDir = join('/opt', 'itchats', 'uploads');
      if (!existsSync(localDir)) mkdirSync(localDir, { recursive: true });

      const assetId = randomUUID();
      const localPath = join(localDir, assetId);
      writeFileSync(localPath, buffer);

      const { getDb } = await import('@itchats/database');
      const { mediaAssets, messages, conversations } = await import('@itchats/database/schema');
      const { eq, and } = await import('drizzle-orm');
      const db = getDb();

      const config = (await import('@itchats/config')).getConfig();
      const apiBase = config.API_BASE_URL || `http://localhost:${config.PORT}`;
      const playbackUrl = `${apiBase}/v1/media/${assetId}`;

      const [asset] = await db.insert(mediaAssets).values({
        id: assetId,
        ownerUserId: req.user.userId,
        visibility: 'private',
        storageProvider: 'local',
        bucket: 'local',
        objectKey: `voice-notes/${assetId}`,
        url: playbackUrl,
        mimeType,
        mediaType: 'audio',
        bytes: fileSize,
        durationMs: durationMs || null,
        metadata: {
          originalName: fileName,
          uploadStatus: 'completed',
          storageSource: 'uploaded',
          localPath,
          durationMs,
        },
      }).returning();

      // Transcribe inline (billed via AiService). Best-effort: an ASR failure
      // must not lose the voice note itself.
      let transcription: string | null = null;
      try {
        const asr = await this.aiService.transcribeVoice(req.user.userId, buffer.toString('base64'));
        transcription = asr?.text?.trim() || null;
      } catch (asrErr: any) {
        this.logger.warn(`Voice note ASR failed (asset ${assetId}): ${asrErr?.message}`);
      }

      // Persist the message row BEFORE any AI reply is triggered by the client.
      let messageId: string | null = null;
      let resolvedConversationId: string | null = conversationId ?? null;
      if (resolvedConversationId || characterId) {
        if (!resolvedConversationId && characterId) {
          const [existing] = await db.select({ id: conversations.id }).from(conversations)
            .where(and(
              eq(conversations.characterId, characterId),
              eq(conversations.createdByUserId, req.user.userId),
            )).limit(1);
          if (existing) {
            resolvedConversationId = existing.id;
          } else {
            const [conv] = await db.insert(conversations).values({
              type: 'human_character',
              characterId,
              createdByUserId: req.user.userId,
            }).returning({ id: conversations.id });
            resolvedConversationId = conv?.id ?? null;
          }
        }

        if (resolvedConversationId) {
          const [msg] = await db.insert(messages).values({
            conversationId: resolvedConversationId,
            senderType: 'user',
            senderUserId: req.user.userId,
            type: 'voice_note',
            content: transcription ?? 'Voice note',
            mediaAssetId: assetId,
            mediaUrl: playbackUrl,
            transcription,
            durationMs: durationMs || null,
            metadata: { mimeType, bytes: fileSize },
          }).returning({ id: messages.id });
          messageId = msg?.id ?? null;

          await db.update(conversations).set({
            lastMessageAt: new Date(),
            updatedAt: new Date(),
          }).where(eq(conversations.id, resolvedConversationId));
        }
      }

      return {
        mediaAssetId: asset!.id,
        playbackUrl,
        durationMs,
        mimeType,
        transcription,
        messageId,
        conversationId: resolvedConversationId,
      };
    } catch (err: any) {
      this.logger.error(`Voice note upload failed: ${err.message}`);
      if (err.status) throw err;
      throw new InternalServerErrorException(err.message || 'Voice note upload failed');
    }
  }
}
