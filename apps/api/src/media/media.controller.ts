import { Controller, Post, Body } from '@nestjs/common';

@Controller('v1/media')
export class MediaController {
  @Post('upload-url')
  async getUploadUrl(@Body() body: { fileName: string; contentType: string; visibility: string }) {
    // TODO: Generate signed S3 upload URL
    return {
      uploadUrl: 'https://storage.example.com/upload/' + body.fileName,
      objectKey: 'uploads/' + body.fileName,
      expiresIn: 3600,
    };
  }
}
