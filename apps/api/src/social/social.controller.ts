import { Controller, Post, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { reports, userBlocks } from '@itchats/database/schema';
import { eq, and } from 'drizzle-orm';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('v1')
export class SocialController {
  @Post('reports')
  @UseGuards(JwtAuthGuard)
  async report(@Body() body: { entityType: string; entityId: string; reason: string; detail?: string }, @Req() req: any) {
    const db = getDb();
    const [report] = await db.insert(reports).values({
      reporterUserId: req.user.id,
      entityType: body.entityType,
      entityId: body.entityId,
      reason: body.reason,
      detail: body.detail,
    }).returning();
    return report;
  }

  @Post('blocks/users/:userId')
  @UseGuards(JwtAuthGuard)
  async blockUser(@Param('userId') userId: string, @Req() req: any) {
    const db = getDb();
    await db.insert(userBlocks).values({
      blockerUserId: req.user.id,
      blockedUserId: userId,
    });
    return { blocked: true };
  }

  @Post('blocks/characters/:characterId')
  @UseGuards(JwtAuthGuard)
  async blockCharacter(@Param('characterId') id: string, @Req() req: any) {
    const db = getDb();
    await db.insert(userBlocks).values({ blockerUserId: req.user.id, blockedCharacterId: id });
    return { blocked: true };
  }

  @Delete('blocks/users/:userId')
  @UseGuards(JwtAuthGuard)
  async unblockUser(@Param('userId') userId: string, @Req() req: any) {
    const db = getDb();
    await db.delete(userBlocks).where(and(eq(userBlocks.blockerUserId, req.user.id), eq(userBlocks.blockedUserId, userId)));
    return { unblocked: true };
  }

  @Delete('blocks/characters/:characterId')
  @UseGuards(JwtAuthGuard)
  async unblockCharacter(@Param('characterId') id: string, @Req() req: any) {
    const db = getDb();
    await db.delete(userBlocks).where(and(eq(userBlocks.blockerUserId, req.user.id), eq(userBlocks.blockedCharacterId, id)));
    return { unblocked: true };
  }
}
