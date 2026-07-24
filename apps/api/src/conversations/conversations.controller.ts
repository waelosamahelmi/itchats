import { Controller, Get, Post, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { conversations, messages, characters } from '@itchats/database/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { SendMessageSchema } from '@itchats/contracts';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('v1/conversations')
export class ConversationsController {
  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Req() req: any) {
    const db = getDb();
    return db.select({
      id: conversations.id,
      type: conversations.type,
      characterId: conversations.characterId,
      title: conversations.title,
      lastMessageAt: conversations.lastMessageAt,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      characterName: characters.name,
    }).from(conversations)
      .leftJoin(characters, eq(conversations.characterId, characters.id))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(50);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: { type: string; characterId?: string }, @Req() req: any) {
    const db = getDb();
    const [conv] = await db.insert(conversations).values({
      type: body.type as 'human_character',
      characterId: body.characterId,
      createdByUserId: req.user.id,
    }).returning();
    return conv;
  }

  @Get(':conversationId/messages')
  @UseGuards(JwtAuthGuard)
  async getMessages(@Param('conversationId') id: string, @Query('before') before?: string) {
    const db = getDb();
    return db.select().from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(desc(messages.createdAt))
      .limit(50);
  }

  @Post(':conversationId/messages')
  @UseGuards(JwtAuthGuard)
  async sendMessage(@Param('conversationId') id: string, @Body() body: unknown, @Req() req: any) {
    const input = SendMessageSchema.parse(body);
    const db = getDb();
    const [msg] = await db.insert(messages).values({
      conversationId: id,
      senderType: 'user',
      senderUserId: req.user.id,
      type: input.type,
      content: input.content,
      clientIdempotencyKey: input.clientIdempotencyKey,
    }).returning();
    return msg;
  }
}
