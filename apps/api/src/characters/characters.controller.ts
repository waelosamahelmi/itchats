import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { CharactersService } from './characters.service';
import { CreateCharacterSchema } from '@itchats/contracts';

@Controller('v1/characters')
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @Post()
  async create(@Body() body: unknown) {
    const input = CreateCharacterSchema.parse(body);
    // TODO: Auth - get owner from JWT
    const ownerUserId = '00000000-0000-0000-0000-000000000001'; // placeholder
    return this.charactersService.create(input, ownerUserId);
  }

  @Get('mine')
  async getMine() {
    const ownerUserId = '00000000-0000-0000-0000-000000000001'; // placeholder
    return this.charactersService.findMine(ownerUserId);
  }

  @Get('discover')
  async discover(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.charactersService.findPublic(Number(page), Number(limit));
  }

  @Get(':characterId')
  async getOne(@Param('characterId') id: string) {
    return this.charactersService.findById(id);
  }

  @Patch(':characterId')
  async update(@Param('characterId') id: string, @Body() body: unknown) {
    return { message: 'Update not yet implemented', id, body };
  }

  @Post(':characterId/publish')
  async publish(@Param('characterId') id: string) {
    const ownerUserId = '00000000-0000-0000-0000-000000000001'; // placeholder
    return this.charactersService.publish(id, ownerUserId);
  }

  @Post(':characterId/follow')
  async follow(@Param('characterId') id: string) {
    return { message: 'Followed', characterId: id };
  }

  @Delete(':characterId/follow')
  async unfollow(@Param('characterId') id: string) {
    return { message: 'Unfollowed', characterId: id };
  }
}
