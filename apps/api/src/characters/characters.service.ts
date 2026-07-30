import { Injectable } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characters, characterLocations, characterFollows } from '@itchats/database/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { CreateCharacterInput } from '@itchats/contracts';

@Injectable()
export class CharactersService {
  async create(input: CreateCharacterInput, ownerUserId: string) {
    const db = getDb();
    const [character] = await db.insert(characters).values({
      ownerUserId,
      name: input.name,
      handle: input.handle,
      visibility: input.visibility,
      description: input.description ?? '',
      personality: input.personality ?? '',
      backstory: input.backstory ?? '',
      ageDisplay: input.ageDisplay,
      gender: input.gender,
      pronouns: input.pronouns,
      occupation: input.occupation,
      interests: input.interests ?? [],
      languages: input.languages ?? ['en'],
      defaultLanguage: input.defaultLanguage ?? 'en',
      identityOrigin: input.visibility === 'public' ? 'text_generated' : 'private_text_generated',
      status: 'draft',
      autonomyConfig: input.autonomyLevel ? { autonomyLevel: input.autonomyLevel, storyCadence: input.storyCadence ?? 'manual' } : {},
    }).returning();

    if (input.city) {
      await db.insert(characterLocations).values({
        characterId: character!.id,
        city: input.city,
        countryCode: input.countryCode,
        timezone: input.timezone,
        source: 'declared',
      });
    }

    return character;
  }

  async findMine(ownerUserId: string, page = 1, limit = 20, visibility?: string) {
    const db = getDb();
    const conditions: any[] = [
      eq(characters.ownerUserId, ownerUserId),
      sql`${characters.deletedAt} IS NULL`,
    ];
    if (visibility) {
      conditions.push(eq(characters.visibility, visibility as any));
    }
    return db.select().from(characters)
      .where(and(...conditions))
      .orderBy(sql`${characters.createdAt} DESC`)
      .limit(Math.min(limit, 50))
      .offset((page - 1) * limit);
  }

  async findPublic(page = 1, limit = 20) {
    const db = getDb();
    return db.select({
      id: characters.id,
      name: characters.name,
      avatarUrl: characters.avatarUrl,
      description: characters.description,
      mood: characters.mood,
      followerCount: characters.followerCount,
      characterScore: characters.characterScore,
      gender: characters.gender,
      ageDisplay: characters.ageDisplay,
    }).from(characters).where(
      and(
        eq(characters.visibility, 'public'),
        eq(characters.status, 'published'),
        sql`${characters.deletedAt} IS NULL`,
      )
    ).limit(Math.min(limit, 50)).offset((page - 1) * limit);
  }

  async findById(id: string, viewerUserId?: string) {
    const db = getDb();
    const [character] = await db.select().from(characters).where(eq(characters.id, id)).limit(1);
    if (!character) return null;

    const [location] = await db.select().from(characterLocations)
      .where(eq(characterLocations.characterId, id)).limit(1);

    const [follows] = await db.select({ count: sql<number>`count(*)` })
      .from(characterFollows).where(eq(characterFollows.characterId, id));

    // Get relationship if viewer is provided
    let relationship = null;
    if (viewerUserId && viewerUserId !== character.ownerUserId) {
      const { characterRelationships } = await import('@itchats/database/schema');
      const [rel] = await db.select().from(characterRelationships)
        .where(and(
          eq(characterRelationships.characterId, id),
          eq(characterRelationships.userId, viewerUserId),
        )).limit(1);
      if (rel) {
        relationship = {
          level: Math.round(Number(rel.visibleLevel) || 1),
          familiarity: Number(rel.familiarity) || 0,
          trust: Number(rel.trust) || 0,
          warmth: Number(rel.warmth) || 0,
          affinity: Number(rel.affinity) || 0,
          tension: Number(rel.tension) || 0,
        };
      }
    }

    return {
      ...character,
      location: location || null,
      followersCount: follows?.count ?? 0,
      relationship,
      autonomy: character.autonomyConfig || {},
      mood: character.mood,
      stats: {
        characterScore: character.characterScore,
        followerCount: character.followerCount,
        isRoleplayAvailable: character.isRoleplayAvailable,
      },
    };
  }

  async publish(characterId: string, ownerUserId: string) {
    const db = getDb();
    const [character] = await db.select().from(characters).where(
      and(eq(characters.id, characterId), eq(characters.ownerUserId, ownerUserId))
    ).limit(1);

    if (!character) throw new Error('Character not found');
    if (character.visibility !== 'public') throw new Error('Only public characters can be published');
    if (character.identityOrigin === 'private_uploaded_reference') {
      throw new Error('Characters with uploaded references must regenerate identity before publishing');
    }

    const [updated] = await db.update(characters).set({
      status: 'published',
      publishedAt: new Date(),
    }).where(eq(characters.id, characterId)).returning();

    return updated;
  }

  async updateCharacter(characterId: string, ownerUserId: string, data: Record<string, any>) {
    const db = getDb();
    const [char] = await db.select().from(characters)
      .where(and(eq(characters.id, characterId), eq(characters.ownerUserId, ownerUserId)))
      .limit(1);
    if (!char) throw new Error('Character not found or not owned by you');

    const updatable: Record<string, any> = {};
    const fields = ['name', 'description', 'personality', 'backstory', 'ageDisplay', 'gender',
      'pronouns', 'occupation', 'interests', 'speakingStyle', 'visibility', 'mood', 'avatarUrl'];
    for (const f of fields) {
      if (data[f] !== undefined) updatable[f] = data[f];
    }

    if (data.autonomyLevel !== undefined || data.storyCadence !== undefined) {
      const current = (char.autonomyConfig as Record<string, any>) || {};
      updatable.autonomyConfig = { ...current };
      if (data.autonomyLevel !== undefined) updatable.autonomyConfig.level = data.autonomyLevel;
      if (data.storyCadence !== undefined) updatable.autonomyConfig.cadence = data.storyCadence;
    }

    if (data.emotionState !== undefined) updatable.emotionState = data.emotionState;

    if (Object.keys(updatable).length > 0) {
      await db.update(characters).set(updatable as any).where(eq(characters.id, characterId));
    }

    // Update location if provided
    if (data.city !== undefined || data.countryCode !== undefined) {
      const [existingLoc] = await db.select().from(characterLocations)
        .where(eq(characterLocations.characterId, characterId)).limit(1);
      const locData: Record<string, any> = {};
      if (data.city !== undefined) locData.city = data.city;
      if (data.countryCode !== undefined) locData.countryCode = data.countryCode;
      if (data.timezone !== undefined) locData.timezone = data.timezone;

      if (existingLoc) {
        await db.update(characterLocations).set(locData as any)
          .where(eq(characterLocations.characterId, characterId));
      } else if (data.city) {
        try {
          await db.insert(characterLocations).values({
            characterId, city: data.city, countryCode: data.countryCode,
            timezone: data.timezone, source: 'declared',
          } as any);
        } catch { /* non-fatal */ }
      }
    }

    const [updated] = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1);
    return updated;
  }
}
