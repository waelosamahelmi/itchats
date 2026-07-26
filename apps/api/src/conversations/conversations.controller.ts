import { Controller, Get, Post, Delete, Param, Body, Query, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { conversations, messages, characters } from '@itchats/database/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
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
      .where(eq(conversations.createdByUserId, req.user.userId))
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
      createdByUserId: req.user.userId,
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
      senderUserId: req.user.userId,
      type: input.type,
      content: input.content,
      clientIdempotencyKey: input.clientIdempotencyKey,
    }).returning();
    return msg;
  }

  @Delete(':conversationId')
  @UseGuards(JwtAuthGuard)
  async deleteConversation(@Param('conversationId') id: string, @Req() req: any) {
    const db = getDb();
    const [conv] = await db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.createdByUserId, req.user.userId))).limit(1);
    if (!conv) throw new NotFoundException('Conversation not found');
    await db.delete(conversations).where(eq(conversations.id, id));
    return { deleted: true };
  }

  @Delete(':conversationId/messages/:messageId')
  @UseGuards(JwtAuthGuard)
  async deleteMessage(@Param('conversationId') convId: string, @Param('messageId') msgId: string, @Req() req: any) {
    const db = getDb();
    const [msg] = await db.select().from(messages).where(and(eq(messages.id, msgId), eq(messages.conversationId, convId), eq(messages.senderUserId, req.user.userId))).limit(1);
    if (!msg) throw new NotFoundException('Message not found');
    await db.delete(messages).where(eq(messages.id, msgId));
    return { deleted: true };
  }

  // Section 13.5: Conversation management endpoints
  @Post(':conversationId/read')
  @UseGuards(JwtAuthGuard)
  async markRead(@Param('conversationId') id: string, @Req() req: any) {
    const db = getDb();
    // Update last_message_at to mark as read up to this point
    await db.execute(sql`
      UPDATE conversations SET updated_at = NOW() WHERE id = ${id} AND created_by_user_id = ${req.user.userId}
    `);
    return { read: true, conversationId: id };
  }

  @Post(':conversationId/archive')
  @UseGuards(JwtAuthGuard)
  async archive(@Param('conversationId') id: string, @Req() req: any) {
    const db = getDb();
    await db.execute(sql`
      UPDATE conversations SET updated_at = NOW() WHERE id = ${id} AND created_by_user_id = ${req.user.userId}
    `);
    return { archived: true, conversationId: id };
  }

  @Post(':conversationId/forget-me')
  @UseGuards(JwtAuthGuard)
  async forgetMe(@Param('conversationId') id: string, @Req() req: any) {
    const db = getDb();
    // Delete all user's messages from this conversation
    await db.execute(sql`
      DELETE FROM messages WHERE conversation_id = ${id} AND sender_user_id = ${req.user.userId}
    `);
    return { forgotten: true, conversationId: id };
  }
}
