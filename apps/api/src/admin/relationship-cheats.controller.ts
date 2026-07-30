import { Body, Controller, Inject, NotFoundException, Post, Req, UseGuards } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { adminAuditLogs, characterRelationships, characters, users } from '@itchats/database/schema';
import { and, eq } from 'drizzle-orm';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AdminRoleGuard } from './admin-role.guard';
import {
  RELATIONSHIP_PRESETS,
  buildRelationshipPresetUpdate,
  type RelationshipPresetName,
} from '../relationship-engine/relationship-presets';

@Controller('v1/admin/relationship-cheats')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class RelationshipCheatsController {
  @Post('apply')
  async apply(
    @Body() body: { characterId?: string; userId?: string; preset?: RelationshipPresetName },
    @Req() req: any,
  ) {
    if (!body.characterId || !body.userId || !body.preset || !RELATIONSHIP_PRESETS[body.preset]) {
      throw new NotFoundException('Character, user, and valid preset are required');
    }
    const db = getDb();
    const [[character], [user], [existing]] = await Promise.all([
      db.select({ id: characters.id }).from(characters).where(eq(characters.id, body.characterId)).limit(1),
      db.select({ id: users.id }).from(users).where(eq(users.id, body.userId)).limit(1),
      db.select().from(characterRelationships).where(and(
        eq(characterRelationships.characterId, body.characterId),
        eq(characterRelationships.userId, body.userId),
      )).limit(1),
    ]);
    if (!character || !user) throw new NotFoundException('Character or user not found');

    const update = buildRelationshipPresetUpdate(body.preset);
    let relationshipId: string;
    if (existing) {
      const [saved] = await db.update(characterRelationships).set(update as any)
        .where(eq(characterRelationships.id, existing.id)).returning({ id: characterRelationships.id });
      relationshipId = saved!.id;
    } else {
      const [saved] = await db.insert(characterRelationships).values({
        characterId: body.characterId, userId: body.userId, ...update,
      } as any).returning({ id: characterRelationships.id });
      relationshipId = saved!.id;
    }

    await db.insert(adminAuditLogs).values({
      adminUserId: req.user.userId,
      action: 'relationship.cheat.apply',
      entityType: 'character_relationship',
      entityId: relationshipId,
      beforeJson: existing ?? null,
      afterJson: { characterId: body.characterId, userId: body.userId, preset: body.preset, ...update },
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
    return { relationshipId, preset: body.preset, testOverride: true };
  }
}
