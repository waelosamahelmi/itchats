import { Controller, Get, Post, Delete, Param, Body, Req, UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { StoriesService } from './stories.service';

@Controller('v1/stories')
export class StoriesController {
  constructor(@Inject(StoriesService) private readonly storiesService: StoriesService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async getAllStories(@Req() req: any) {
    return this.storiesService.getAllStories(req?.user?.userId);
  }

  @Get('feed')
  async getFeed() {
    return this.storiesService.getFeed();
  }

  @Get('following')
  @UseGuards(JwtAuthGuard)
  async getFollowing(@Req() req: any) {
    return this.storiesService.getFollowing(req.user.userId);
  }

  @Get('character/:characterId')
  async getCharacterStories(@Param('characterId') characterId: string) {
    return this.storiesService.getCharacterStories(characterId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: { storyType: string; caption?: string; mediaAssetId?: string }, @Req() req: any) {
    return this.storiesService.createStory(req.user.userId, body);
  }

  @Delete(':storyId')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('storyId') id: string, @Req() req: any) {
    return this.storiesService.deleteStory(req.user.userId, id);
  }

  @Post(':storyId/view')
  @UseGuards(JwtAuthGuard)
  async view(@Param('storyId') id: string, @Req() req: any) {
    return this.storiesService.viewStory(req.user.userId, id);
  }

  @Post(':storyId/like')
  @UseGuards(JwtAuthGuard)
  async like(@Param('storyId') id: string, @Req() req: any) {
    return this.storiesService.likeStory(req.user.userId, id);
  }

  @Delete(':storyId/like')
  @UseGuards(JwtAuthGuard)
  async unlike(@Param('storyId') id: string, @Req() req: any) {
    return this.storiesService.unlikeStory(req.user.userId, id);
  }
}
