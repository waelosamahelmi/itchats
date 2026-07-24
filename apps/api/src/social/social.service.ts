import { Injectable } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { reports, userBlocks, characterFollows } from '@itchats/database/schema';
import { eq, and, sql } from 'drizzle-orm';

@Injectable()
export class SocialService {
  async report(userId: string, data: { entityType: string; entityId: string; reason: string; detail?: string }) {
    const db = getDb();
    const [report] = await db.insert(reports).values({
      reporterUserId: userId, entityType: data.entityType, entityId: data.entityId,
      reason: data.reason, detail: data.detail,
    }).returning();
    return report;
  }

  async blockUser(userId: string, blockedUserId: string) {
    const db = getDb();
    await db.insert(userBlocks).values({ blockerUserId: userId, blockedUserId }).onConflictDoNothing();
    return { blocked: true };
  }

  async blockCharacter(userId: string, characterId: string) {
    const db = getDb();
    await db.insert(userBlocks).values({ blockerUserId: userId, blockedCharacterId: characterId }).onConflictDoNothing();
    return { blocked: true };
  }

  async unblockUser(userId: string, blockedUserId: string) {
    const db = getDb();
    await db.delete(userBlocks).where(and(eq(userBlocks.blockerUserId, userId), eq(userBlocks.blockedUserId, blockedUserId)));
    return { unblocked: true };
  }

  async followCharacter(userId: string, characterId: string) {
    const db = getDb();
    await db.insert(characterFollows).values({ userId, characterId }).onConflictDoNothing();
    return { following: true };
  }

  async unfollowCharacter(userId: string, characterId: string) {
    const db = getDb();
    await db.delete(characterFollows).where(and(eq(characterFollows.userId, userId), eq(characterFollows.characterId, characterId)));
    return { unfollowed: true };
  }
}
