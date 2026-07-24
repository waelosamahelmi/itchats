import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req, Inject } from '@nestjs/common';
import { CharactersService } from './characters.service';
import { CharacterCreationService } from './character-creation.service';
import { CreateCharacterSchema } from '@itchats/contracts';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt.guard';

@Controller('v1/characters')
export class CharactersController {
  constructor(
    @Inject(CharactersService) private readonly charactersService: CharactersService,
    @Inject(CharacterCreationService) private readonly creationService: CharacterCreationService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: unknown, @Req() req: any) {
    return this.creationService.createCharacter(CreateCharacterSchema.parse(body), req.user.userId);
  }

  @Post('autofill')
  @UseGuards(JwtAuthGuard)
  async autofill(@Body() body: { name: string; concept: string }) {
    return this.creationService.autofillCharacter(body.name, body.concept);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async getMine(@Req() req: any) { return this.charactersService.findMine(req.user.userId); }

  @Get('discover')
  @UseGuards(OptionalJwtAuthGuard)
  async discover(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.charactersService.findPublic(Number(page), Number(limit));
  }

  @Get('search')
  async search(@Query('q') q: string) { return { results: [], query: q }; }

  @Get(':characterId')
  async getOne(@Param('characterId') id: string) { return this.charactersService.findById(id); }

  @Patch(':characterId')
  @UseGuards(JwtAuthGuard)
  async update(@Param('characterId') id: string, @Body() body: unknown) { return { message: 'Updated', id }; }

  @Delete(':characterId')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('characterId') id: string) { return { deleted: true, id }; }

  @Post(':characterId/publish')
  @UseGuards(JwtAuthGuard)
  async publish(@Param('characterId') id: string, @Req() req: any) {
    return this.creationService.publishCharacter(id, req.user.userId);
  }

  @Post(':characterId/follow')
  @UseGuards(JwtAuthGuard)
  async follow(@Param('characterId') id: string) { return { followed: true, characterId: id }; }

  @Delete(':characterId/follow')
  @UseGuards(JwtAuthGuard)
  async unfollow(@Param('characterId') id: string) { return { unfollowed: true, characterId: id }; }
}
