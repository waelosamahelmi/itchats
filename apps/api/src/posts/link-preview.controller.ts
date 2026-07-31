import { Controller, Post, Get, Body, Param, UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { LinkPreviewService } from '../posts/link-preview.service';

@Controller('v1/link-preview')
export class LinkPreviewController {
  constructor(
    @Inject(LinkPreviewService) private readonly linkPreview: LinkPreviewService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async getLinkPreview(@Body() body: { url: string }) {
    return this.linkPreview.getLinkPreview(body.url);
  }

  @Get('post/:postId')
  @UseGuards(JwtAuthGuard)
  async getPostLinkPreview(@Param('postId') postId: string) {
    const preview = await this.linkPreview.getPostLinkPreview(postId);
    if (!preview) return null;
    return preview;
  }
}
