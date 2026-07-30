import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { PostsService } from './posts.service';

@Controller('v1/posts')
export class PostsController {
  constructor(
    @Inject(PostsService) private readonly postsService: PostsService,
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
    },
    @Req() req: any,
  ) {
    return this.postsService.createPost(req.user.userId, body);
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

  @Post(':id/react')
  @UseGuards(JwtAuthGuard)
  async reactToPost(
    @Param('id') id: string,
    @Body() body: { reactionType: string },
    @Req() req: any,
  ) {
    return this.postsService.likePost(req.user.userId, id, body.reactionType);
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
    return this.postsService.addComment(req.user.userId, id, body.content, body.parentCommentId);
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
}
