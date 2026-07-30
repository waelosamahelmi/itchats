import { Controller, Post, Body, Req, UseGuards, Param, Get } from '@nestjs/common';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { z } from 'zod';

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

@Controller('v1/media')
@UseGuards(JwtAuthGuard)
export class MediaController {
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
  async getVoiceNoteUploadUrl(@Body() body: { fileName?: string; fileSize: number }, @Req() req: any) {
    return this.media.createVoiceNoteUploadUrl(
      req.user.userId,
      body.fileName ?? `voice-${Date.now()}.webm`,
      body.fileSize,
    );
  }

  @Post('confirm-upload')
  async confirmUpload(@Body() body: unknown) {
    const input = ConfirmUploadSchema.parse(body);
    return this.media.confirmUpload(input.mediaAssetId, input.sha256);
  }

  @Get(':mediaAssetId/download-url')
  async getDownloadUrl(@Param('mediaAssetId') mediaAssetId: string) {
    return this.media.getDownloadUrl(mediaAssetId);
  }
}
