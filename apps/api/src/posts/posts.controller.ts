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
} from '@nestjs/common';
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
