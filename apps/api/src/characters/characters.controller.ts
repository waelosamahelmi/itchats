import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req, Inject, NotFoundException } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characters, characterFollows, characterLocations, characterReferenceAssets } from '@itchats/database/schema';
import { eq, and, or, ilike, sql } from 'drizzle-orm';
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
  async search(@Query('q') q: string, @Query('page') page = '1', @Query('limit') limit = '20') {
    if (!q || q.trim().length < 2) return { results: [], query: q };
    const db = getDb();
    const results = await db.select().from(characters)
      .where(and(
        eq(characters.visibility, 'public'),
        eq(characters.status, 'published'),
        or(ilike(characters.name, `%${q}%`), ilike(characters.description, `%${q}%`), ilike(characters.personality, `%${q}%`)),
      ))
      .limit(Number(limit)).offset((Number(page) - 1) * Number(limit));
    return { results, query: q };
  }

  @Get(':characterId')
  @UseGuards(OptionalJwtAuthGuard)
  async getOne(@Param('characterId') id: string, @Req() req: any) {
    const char = await this.charactersService.findById(id);
    if (!char) throw new NotFoundException('Character not found');
    if (char.visibility === 'private' && char.ownerUserId !== req?.user?.userId) {
      return { id: char.id, name: 'Private Character', visibility: 'private' };
    }
    const db = getDb();
    const [location] = await db.select().from(characterLocations)
      .where(eq(characterLocations.characterId, id)).limit(1);
    const [follows] = await db.select({ count: sql<number>`count(*)` })
      .from(characterFollows).where(eq(characterFollows.characterId, id));
    return { ...char, location: location || null, followersCount: follows?.count ?? 0, avatarUrl: null };
  }

  @Patch(':characterId')
  @UseGuards(JwtAuthGuard)
  async update(@Param('characterId') id: string, @Body() body: any, @Req() req: any) {
    const db = getDb();
    const [char] = await db.select().from(characters)
      .where(and(eq(characters.id, id), eq(characters.ownerUserId, req.user.userId))).limit(1);
    if (!char) throw new NotFoundException('Character not found or not owned by you');
    const updatable = { name: body.name, description: body.description, personality: body.personality, backstory: body.backstory, ageDisplay: body.ageDisplay, gender: body.gender, pronouns: body.pronouns, occupation: body.occupation, interests: body.interests, speakingStyle: body.speakingStyle, emotionState: body.emotionState };
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(updatable)) { if (v !== undefined) clean[k] = v; }
    const [updated] = await db.update(characters).set(clean).where(eq(characters.id, id)).returning();
    return updated;
  }

  @Delete(':characterId')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('characterId') id: string, @Req() req: any) {
    const db = getDb();
    const [char] = await db.select().from(characters)
      .where(and(eq(characters.id, id), eq(characters.ownerUserId, req.user.userId))).limit(1);
    if (!char) throw new NotFoundException('Character not found or not owned by you');
    await db.update(characters).set({ deletedAt: new Date(), status: 'deleted' }).where(eq(characters.id, id));
    return { deleted: true, id };
  }

  @Post(':characterId/publish')
  @UseGuards(JwtAuthGuard)
  async publish(@Param('characterId') id: string, @Req() req: any) {
    return this.creationService.publishCharacter(id, req.user.userId);
  }

  @Post(':characterId/generate-image')
  @UseGuards(JwtAuthGuard)
  async generateImage(@Param('characterId') id: string, @Req() req: any) {
    return this.creationService.generateCharacterImage(id, req.user.userId);
  }

  @Post(':characterId/follow')
  @UseGuards(JwtAuthGuard)
  async follow(@Param('characterId') id: string, @Req() req: any) {
    const db = getDb();
    await db.insert(characterFollows).values({ userId: req.user.userId, characterId: id }).onConflictDoNothing();
    return { followed: true, characterId: id };
  }

  @Delete(':characterId/follow')
  @UseGuards(JwtAuthGuard)
  async unfollow(@Param('characterId') id: string, @Req() req: any) {
    const db = getDb();
    await db.delete(characterFollows).where(and(eq(characterFollows.userId, req.user.userId), eq(characterFollows.characterId, id)));
    return { unfollowed: true, characterId: id };
  }
}
