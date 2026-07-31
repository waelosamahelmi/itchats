import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req, Inject, NotFoundException, forwardRef } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characters, characterFollows, characterLocations, characterVoiceProfiles } from '@itchats/database/schema';
import { eq, and, or, ilike, sql, desc } from 'drizzle-orm';
import { CharactersService } from './characters.service';
import { CharacterCreationService } from './character-creation.service';
import { CreateCharacterSchema } from '@itchats/contracts';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { NotificationsService, NOTIFICATION_TYPES } from '../notifications/notifications.service';

@Controller('v1/characters')
export class CharactersController {
  constructor(
    @Inject(CharactersService) private readonly charactersService: CharactersService,
    @Inject(CharacterCreationService) private readonly creationService: CharacterCreationService,
    @Inject(forwardRef(() => NotificationsService)) private readonly notifications: NotificationsService,
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

  // ── Updated mine endpoint with pagination & visibility filter ──
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async getMine(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('visibility') visibility: string | undefined,
    @Req() req: any,
  ) {
    return this.charactersService.findMine(req.user.userId, Number(page), Number(limit), visibility);
  }

  // ── Updated discover with grid fields ──
  @Get('discover')
  @UseGuards(OptionalJwtAuthGuard)
  async discover(@Query('page') page = '1', @Query('limit') limit = '20', @Req() req: any) {
    return this.charactersService.findPublic(Number(page), Number(limit), req?.user?.userId);
  }

  @Get('suggested')
  async suggested(@Query('limit') limit = '8') {
    return this.charactersService.findSuggested(Number(limit));
  }

  @Get('search')
  async search(@Query('q') q: string, @Query('page') page = '1', @Query('limit') limit = '20') {
    if (!q || q.trim().length < 2) return { results: [], query: q };
    const db = getDb();
    const results = await db.select().from(characters)
      .where(and(
        eq(characters.visibility, 'public'),
        eq(characters.status, 'published'),
        sql`${characters.deletedAt} IS NULL`,
        or(ilike(characters.name, `%${q}%`), ilike(characters.description, `%${q}%`), ilike(characters.personality, `%${q}%`)),
      ))
      .limit(Number(limit)).offset((Number(page) - 1) * Number(limit));
    return { results, query: q };
  }

  // ── Mention search — lightweight autocomplete endpoint ──
  @Get('mention-search')
  @UseGuards(OptionalJwtAuthGuard)
  async mentionSearch(@Query('q') q: string, @Query('limit') limit = '10', @Req() req: any) {
    const prefix = (q || '').trim();
    const db = getDb();
    const currentUserId = req?.user?.userId;

    const results = await db.select({
      id: characters.id,
      name: characters.name,
      handle: characters.handle,
      avatarUrl: characters.avatarUrl,
      visibility: characters.visibility,
    }).from(characters)
      .where(and(
        sql`${characters.deletedAt} IS NULL`,
        eq(characters.status, 'published'),
        or(
          eq(characters.visibility, 'public'),
          currentUserId ? eq(characters.ownerUserId, currentUserId) : undefined,
        ),
        prefix ? or(
          sql`LOWER(${characters.handle}) LIKE ${prefix.toLowerCase() + '%'}`,
          sql`LOWER(${characters.name}) LIKE ${prefix.toLowerCase() + '%'}`,
        ) : undefined,
      ))
      .orderBy(
        sql`CASE WHEN LOWER(${characters.handle}) = ${prefix.toLowerCase()} THEN 0 ELSE 1 END`,
        desc(characters.followerCount),
        characters.name,
      )
      .limit(Number(limit));

    return { results, query: prefix };
  }

  // ── Updated single character detail ──
  @Get(':characterId')
  @UseGuards(OptionalJwtAuthGuard)
  async getOne(@Param('characterId') id: string, @Req() req: any) {
    const char = await this.charactersService.findById(id, req?.user?.userId);
    if (!char) throw new NotFoundException('Character not found');
    if (char.visibility === 'private' && char.ownerUserId !== req?.user?.userId) {
      return { id: char.id, name: 'Private Character', visibility: 'private' };
    }
    return char;
  }

  // ── Updated edit character ──
  @Patch(':characterId')
  @UseGuards(JwtAuthGuard)
  async update(@Param('characterId') id: string, @Body() body: any, @Req() req: any) {
    return this.charactersService.updateCharacter(id, req.user.userId, body);
  }

  // ── Delete character ──
  @Delete(':characterId')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('characterId') id: string, @Req() req: any) {
    const db = getDb();
    const [char] = await db.select().from(characters)
      .where(and(eq(characters.id, id), eq(characters.ownerUserId, req.user.userId))).limit(1);
    if (!char) throw new NotFoundException('Character not found or not owned by you');

    try {
      await db.update(characters).set({
        deletedAt: new Date(),
        status: 'deleted' as any,
      } as any).where(eq(characters.id, id));
    } catch (err: any) {
      await db.execute(
        sql`UPDATE characters SET deleted_at = NOW(), status = 'deleted' WHERE id = ${id}`
      );
    }

    return { deleted: true, id };
  }

  @Post(':characterId/publish')
  @UseGuards(JwtAuthGuard)
  async publish(@Param('characterId') id: string, @Req() req: any) {
    return this.creationService.publishCharacter(id, req.user.userId);
  }

  @Post(':characterId/unpublish')
  @UseGuards(JwtAuthGuard)
  async unpublish(@Param('characterId') id: string, @Req() req: any) {
    const db = getDb();
    const [char] = await db.select().from(characters)
      .where(and(eq(characters.id, id), eq(characters.ownerUserId, req.user.userId))).limit(1);
    if (!char) throw new NotFoundException('Character not found or not owned by you');
    if (char.status !== 'published') throw new NotFoundException('Character is not published');
    await db.update(characters).set({ status: 'ready' as any }).where(eq(characters.id, id));
    return { unpublished: true, id };
  }

  @Post(':characterId/regenerate-public-identity')
  @UseGuards(JwtAuthGuard)
  async regeneratePublicIdentity(@Param('characterId') id: string, @Req() req: any) {
    return this.creationService.regeneratePublicIdentity(id, req.user.userId);
  }

  @Post(':characterId/generate-image')
  @UseGuards(JwtAuthGuard)
  async generateImage(@Param('characterId') id: string, @Req() req: any) {
    return this.creationService.generateCharacterImage(id, req.user.userId);
  }

  // ── Follow/Unfollow ──
  @Post(':characterId/follow')
  @UseGuards(JwtAuthGuard)
  async follow(@Param('characterId') id: string, @Req() req: any) {
    const db = getDb();
    await db.insert(characterFollows).values({ userId: req.user.userId, characterId: id }).onConflictDoNothing();

    // Update follower count on character
    const [fResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(characterFollows)
      .where(eq(characterFollows.characterId, id));
    const followerCount = Number.isFinite(Number(fResult?.count)) ? Number(fResult?.count ?? 0) : 0;
    await db.update(characters)
      .set({ followerCount })
      .where(eq(characters.id, id));

    // Notify character owner about new follower
    const [character] = await db.select({ ownerUserId: characters.ownerUserId, name: characters.name })
      .from(characters).where(eq(characters.id, id)).limit(1);
    if (character?.ownerUserId && character.ownerUserId !== req.user.userId) {
      const [follower] = await db.select({ username: sql<string>`COALESCE(${sql.raw('(SELECT display_name FROM user_profiles WHERE user_id = users.id)')}, users.username)` })
        .from(sql`users`).where(eq(sql`users.id`, req.user.userId)).limit(1);
      const followerName = follower?.username ?? 'Someone';

      this.notifications.create({
        userId: character.ownerUserId,
        type: NOTIFICATION_TYPES.NEW_FOLLOWER,
        actorUserId: req.user.userId,
        actorCharacterId: null,
        entityType: 'character',
        entityId: id,
        title: 'New follower!',
        body: `${followerName} started following ${character.name}`,
        data: { characterId: id },
      }).catch(() => {});
    }

    return { followed: true, characterId: id, followerCount };
  }

  @Delete(':characterId/follow')
  @UseGuards(JwtAuthGuard)
  async unfollow(@Param('characterId') id: string, @Req() req: any) {
    const db = getDb();
    await db.delete(characterFollows).where(
      and(eq(characterFollows.userId, req.user.userId), eq(characterFollows.characterId, id)),
    );

    const [ufResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(characterFollows)
      .where(eq(characterFollows.characterId, id));
    const followerCount = Number.isFinite(Number(ufResult?.count)) ? Number(ufResult?.count ?? 0) : 0;
    await db.update(characters)
      .set({ followerCount })
      .where(eq(characters.id, id));

    return { unfollowed: true, characterId: id, followerCount };
  }

  // ── Followers ──
  @Get(':characterId/followers')
  async getFollowers(@Param('characterId') id: string) {
    const db = getDb();
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(characterFollows)
      .where(eq(characterFollows.characterId, id));
    return { characterId: id, followerCount: Number(result?.count ?? 0) };
  }
}
