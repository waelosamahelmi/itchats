import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req, Inject, NotFoundException } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characters, characterFollows, characterLocations, characterReferenceAssets, characterVoiceProfiles } from '@itchats/database/schema';
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

    // Core character fields
    const updatable: Record<string, any> = {};
    const fields = ['name', 'description', 'personality', 'backstory', 'ageDisplay', 'gender', 'pronouns', 'occupation', 'interests', 'speakingStyle', 'visibility'];
    for (const f of fields) { if (body[f] !== undefined) updatable[f] = body[f]; }

    // Handle appearance as a top-level field (store in description if no dedicated column)
    if (body.appearance !== undefined && !updatable.description) {
      updatable.description = body.appearance;
    }

    // Autonomy config (JSON)
    if (body.autonomyLevel !== undefined || body.storyCadence !== undefined) {
      const current = (char.autonomyConfig as Record<string, any>) || {};
      const newConfig: Record<string, any> = { ...current };
      if (body.autonomyLevel !== undefined) newConfig.level = body.autonomyLevel;
      if (body.storyCadence !== undefined) newConfig.cadence = body.storyCadence;
      updatable.autonomyConfig = newConfig;
    }

    // Emotion state
    if (body.emotionState !== undefined) updatable.emotionState = body.emotionState;

    if (Object.keys(updatable).length > 0) {
      await db.update(characters).set(updatable as any).where(eq(characters.id, id));
    }

    // Update location
    if (body.city !== undefined || body.countryCode !== undefined) {
      const [existingLoc] = await db.select().from(characterLocations)
        .where(eq(characterLocations.characterId, id)).limit(1);
      const locData: Record<string, any> = {};
      if (body.city !== undefined) locData.city = body.city;
      if (body.countryCode !== undefined) locData.countryCode = body.countryCode;
      if (body.timezone !== undefined) locData.timezone = body.timezone;

      if (existingLoc) {
        await db.update(characterLocations).set(locData as any).where(eq(characterLocations.characterId, id));
      } else if (body.city) {
        try {
          await db.insert(characterLocations).values({
            characterId: id, city: body.city,
            countryCode: body.countryCode,
            timezone: body.timezone,
            source: 'declared',
          } as any);
        } catch { /* non-fatal */ }
      }
    }

    // Update voice profile
    if (body.voiceProfileId !== undefined) {
      const [existingVoice] = await db.select().from(characterVoiceProfiles)
        .where(eq(characterVoiceProfiles.characterId, id)).limit(1);
      if (existingVoice) {
        await db.update(characterVoiceProfiles).set({ voiceId: body.voiceProfileId } as any)
          .where(eq(characterVoiceProfiles.characterId, id));
      } else {
        try {
          await db.insert(characterVoiceProfiles).values({
            characterId: id, voiceId: body.voiceProfileId, provider: 'alibaba',
          } as any);
        } catch { /* non-fatal */ }
      }
    }

    // Return updated character
    const [updated] = await db.select().from(characters).where(eq(characters.id, id)).limit(1);
    return updated;
  }

  @Delete(':characterId')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('characterId') id: string, @Req() req: any) {
    const db = getDb();
    const [char] = await db.select().from(characters)
      .where(and(eq(characters.id, id), eq(characters.ownerUserId, req.user.userId))).limit(1);
    if (!char) throw new NotFoundException('Character not found or not owned by you');
    
    // Soft-delete: mark as deleted but keep the row for referential integrity
    try {
      await db.update(characters).set({ 
        deletedAt: new Date(), 
        status: 'deleted' as any,
      } as any).where(eq(characters.id, id));
    } catch (err: any) {
      // If soft-delete fails (e.g., enum constraint), try direct SQL
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
