import { Injectable } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characters, characterLocations } from '@itchats/database/schema';
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

  async findMine(ownerUserId: string) {
    const db = getDb();
    return db.select().from(characters).where(eq(characters.ownerUserId, ownerUserId)).orderBy(sql`${characters.createdAt} DESC`);
  }

  async findPublic(page = 1, limit = 20) {
    const db = getDb();
    return db.select().from(characters).where(
      and(eq(characters.visibility, 'public'), eq(characters.status, 'published'))
    ).limit(limit).offset((page - 1) * limit);
  }

  async findById(id: string) {
    const db = getDb();
    const [character] = await db.select().from(characters).where(eq(characters.id, id)).limit(1);
    return character;
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
}
