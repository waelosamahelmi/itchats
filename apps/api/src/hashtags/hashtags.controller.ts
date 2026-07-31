import { Controller, Get, Param, Query, Inject } from '@nestjs/common';
import { HashtagsService } from './hashtags.service';

@Controller('v1/hashtags')
export class HashtagsController {
  constructor(@Inject(HashtagsService) private readonly hashtagsService: HashtagsService) {}

  @Get('trending')
  async trending(@Query('limit') limit = '20') {
    return this.hashtagsService.getTrending(Number(limit));
  }

  @Get(':name/posts')
  async getPosts(
    @Param('name') name: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.hashtagsService.getPostsByHashtag(name, Number(page), Number(limit));
  }
}
