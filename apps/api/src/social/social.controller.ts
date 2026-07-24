import { Controller, Post, Delete, Param, Body } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { reports, userBlocks, characterFollows } from '@itchats/database/schema';
import { eq } from 'drizzle-orm';

@Controller('v1')
export class SocialController {
  @Post('reports')
  async report(@Body() body: { entityType: string; entityId: string; reason: string; detail?: string }) {
    const db = getDb();
    const [report] = await db.insert(reports).values({
      reporterUserId: '00000000-0000-0000-0000-000000000001',
      entityType: body.entityType,
      entityId: body.entityId,
      reason: body.reason,
      detail: body.detail,
    }).returning();
    return report;
  }

  @Post('blocks/users/:userId')
  async blockUser(@Param('userId') userId: string) {
    const db = getDb();
    await db.insert(userBlocks).values({
      blockerUserId: '00000000-0000-0000-0000-000000000001',
      blockedUserId: userId,
    });
    return { blocked: true };
  }

  @Delete('blocks/users/:userId')
  async unblockUser(@Param('userId') userId: string) {
    const db = getDb();
    await db.delete(userBlocks).where(eq(userBlocks.blockedUserId, userId));
    return { unblocked: true };
  }
}
