import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { conversations, messages } from '@itchats/database/schema';
import { eq, desc } from 'drizzle-orm';
import { SendMessageSchema } from '@itchats/contracts';

@Controller('v1/conversations')
export class ConversationsController {
  @Get()
  async list() {
    const db = getDb();
    return db.select().from(conversations).orderBy(desc(conversations.lastMessageAt)).limit(50);
  }

  @Post()
  async create(@Body() body: { type: string; characterId?: string }) {
    const db = getDb();
    const [conv] = await db.insert(conversations).values({
      type: body.type as 'human_character',
      characterId: body.characterId,
      createdByUserId: '00000000-0000-0000-0000-000000000001',
    }).returning();
    return conv;
  }

  @Get(':conversationId/messages')
  async getMessages(@Param('conversationId') id: string, @Query('before') before?: string) {
    const db = getDb();
    return db.select().from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(desc(messages.createdAt))
      .limit(50);
  }

  @Post(':conversationId/messages')
  async sendMessage(@Param('conversationId') id: string, @Body() body: unknown) {
    const input = SendMessageSchema.parse(body);
    const db = getDb();
    const [msg] = await db.insert(messages).values({
      conversationId: id,
      senderType: 'user',
      senderUserId: '00000000-0000-0000-0000-000000000001',
      type: input.type,
      content: input.content,
      clientIdempotencyKey: input.clientIdempotencyKey,
    }).returning();
    return msg;
  }
}
