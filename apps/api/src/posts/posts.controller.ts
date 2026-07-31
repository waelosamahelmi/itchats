import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Put,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  Inject,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { PostsService } from './posts.service';
import { AiReactionsService } from '../ai/ai-reactions.service';

@Controller('v1/posts')
export class PostsController {
  constructor(
    @Inject(PostsService) private readonly postsService: PostsService,
    @Inject(AiReactionsService) private readonly aiReactions: AiReactionsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createPost(
    @Body()
    body: {
      content: string;
      mediaUrl?: string;
      mediaType?: string;
      visibility?: 'public' | 'friends' | 'private';
      nsfw?: boolean;
      repostOfPostId?: string;
      linkPreview?: {
        url: string;
        title?: string;
        description?: string;
        imageUrl?: string;
        siteName?: string;
      };
    },
    @Req() req: any,
  ) {
    const post = await this.postsService.createPost(req.user.userId, body);

    // Schedule AI character reactions for user posts
    void this.aiReactions.scheduleReactions(post.id, req.user.userId);

    return post;
  }

  // ── Public OG Metadata HTML endpoint for social crawlers ──
  @Get('public/:postId')
  async getPostOgHtml(@Param('postId') postId: string, @Res() reply: FastifyReply) {
    const post = await this.postsService.getPostById(postId);
    if (!post) {
      return reply.status(404).type('text/html').send(`<!DOCTYPE html><html><body><h1>Post not found</h1></body></html>`);
    }

    const title = `${post.authorName} on itChats`;
    const description = (post.content || '').slice(0, 200).replace(/"/g, '&quot;');
    const image = post.mediaUrl || post.thumbnailUrl || '';
    const siteUrl = process.env.PUBLIC_URL || 'https://itchats.ai';
    const postUrl = `${siteUrl}/p/${postId}`;
    const authorName = post.authorName || 'Unknown';

    // If no media image, use DiceBear social card fallback
    const ogImage = image || `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(authorName)}&backgroundColor=b6e3f4,c0aede,d1d4f9&size=600`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${ogImage}">
<meta property="og:url" content="${postUrl}">
<meta property="og:site_name" content="itChats">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${ogImage}">
<meta name="robots" content="max-image-preview:large">
</head>
<body style="font-family:system-ui;padding:2rem;text-align:center;background:#08080f;color:#f0f0f0">
<div style="max-width:600px;margin:auto;border-radius:16px;background:rgba(255,255,255,0.05);padding:2rem">
${image ? `<img src="${image}" alt="" style="max-width:100%;border-radius:12px;margin-bottom:1rem">` : ''}
<h1>${authorName}</h1>
<p>${description}</p>
<p><a href="${postUrl}" style="color:#ec4899">View on itChats</a></p>
</div>
</body>
</html>`;

    return reply.type('text/html').send(html);
  }

  @Get('feed')
  @UseGuards(JwtAuthGuard)
  async getFeed(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Req() req: any,
  ) {
    return this.postsService.getFeed(req.user.userId, Number(page), Number(limit));
  }

  @Get('user/:userId')
  @UseGuards(OptionalJwtAuthGuard)
  async getUserPosts(
    @Param('userId') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Req() req: any,
  ) {
    return this.postsService.getUserPosts(req?.user?.userId || '', userId, Number(page), Number(limit));
  }

  @Get('character/:characterId')
  async getCharacterPosts(
    @Param('characterId') characterId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.postsService.getCharacterPosts(characterId, Number(page), Number(limit));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deletePost(@Param('id') id: string, @Req() req: any) {
    return this.postsService.deletePost(req.user.userId, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updatePost(
    @Param('id') id: string,
    @Body() body: { content?: string; mediaUrl?: string; visibility?: 'public' | 'friends' | 'private' },
    @Req() req: any,
  ) {
    return this.postsService.updatePost(req.user.userId, id, body);
  }

  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  async reportPost(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    return this.postsService.reportPost(req.user.userId, id, body.reason);
  }

  @Post(':id/react')
  @UseGuards(JwtAuthGuard)
  async reactToPost(
    @Param('id') id: string,
    @Body() body: { reactionType: string },
    @Req() req: any,
  ) {
    return this.postsService.likePost(req.user.userId, id, body.reactionType);
  }

  @Put(':id/reaction')
  @UseGuards(JwtAuthGuard)
  async putReaction(
    @Param('id') id: string,
    @Body() body: { reactionType: string },
    @Req() req: any,
  ) {
    return this.postsService.likePost(req.user.userId, id, body.reactionType);
  }

  @Delete(':id/reaction')
  @UseGuards(JwtAuthGuard)
  async deleteReaction(@Param('id') id: string, @Req() req: any) {
    return this.postsService.unlikePost(req.user.userId, id);
  }

  @Delete(':id/react')
  @UseGuards(JwtAuthGuard)
  async removeReaction(@Param('id') id: string, @Req() req: any) {
    return this.postsService.unlikePost(req.user.userId, id);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  async addComment(
    @Param('id') id: string,
    @Body() body: { content: string; parentCommentId?: string },
    @Req() req: any,
  ) {
    const comment = await this.postsService.addComment(req.user.userId, id, body.content, body.parentCommentId);

    // If user comments on a character's post, schedule character reply
    void this.aiReactions.scheduleCommentReply(id, comment.id, req.user.userId, body.content, body.parentCommentId).catch(() => {});

    return comment;
  }

  @Delete(':id/comments/:commentId')
  @UseGuards(JwtAuthGuard)
  async deleteComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Req() req: any,
  ) {
    return this.postsService.deleteComment(req.user.userId, commentId);
  }

  @Get(':id/comments')
  async getComments(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.postsService.getPostComments(id, Number(page), Number(limit));
  }

  @Get(':id/reactions')
  async getReactions(@Param('id') id: string) {
    return this.postsService.getPostReactions(id);
  }

  // ── Comment Reactions ──
  @Put('comments/:commentId/reaction')
  @UseGuards(JwtAuthGuard)
  async reactToComment(
    @Param('commentId') commentId: string,
    @Body() body: { reactionType: string },
    @Req() req: any,
  ) {
    return this.postsService.addCommentReaction(req.user.userId, commentId, body.reactionType);
  }

  @Delete('comments/:commentId/reaction')
  @UseGuards(JwtAuthGuard)
  async removeCommentReaction(
    @Param('commentId') commentId: string,
    @Req() req: any,
  ) {
    return this.postsService.removeCommentReaction(req.user.userId, commentId);
  }
}
