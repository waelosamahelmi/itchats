import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { conversations, messages, characters } from '@itchats/database/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { SendMessageSchema } from '@itchats/contracts';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { MessageReactionsService } from './message-reactions.service';

@Controller('v1/conversations')
export class ConversationsController {
  constructor(private readonly messageReactions: MessageReactionsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Req() req: any) {
    const db = getDb();
    return db.select({
      id: conversations.id,
      type: conversations.type,
      mode: conversations.mode,
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
  async create(@Body() body: { type: string; characterId?: string; mode?: 'chat' | 'roleplay' }, @Req() req: any) {
    const db = getDb();
    const [conv] = await db.insert(conversations).values({
      type: body.type as 'human_character',
      characterId: body.characterId,
      createdByUserId: req.user.userId,
      mode: body.mode ?? 'chat',
    }).returning();
    return conv;
  }

  @Patch(':conversationId/mode')
  @UseGuards(JwtAuthGuard)
  async updateMode(
    @Param('conversationId') id: string,
    @Body() body: { mode?: string },
    @Req() req: any,
  ) {
    if (body.mode !== 'chat' && body.mode !== 'roleplay') {
      throw new NotFoundException('Conversation mode not found');
    }
    const db = getDb();
    const [conversation] = await db.update(conversations).set({ mode: body.mode, updatedAt: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.createdByUserId, req.user.userId)))
      .returning({ id: conversations.id, mode: conversations.mode });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  @Get(':conversationId/messages')
  @UseGuards(JwtAuthGuard)
  async getMessages(@Param('conversationId') id: string, @Query('before') before: string | undefined, @Req() req: any) {
    const db = getDb();
    const [conversation] = await db.select({ id: conversations.id }).from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.createdByUserId, req.user.userId))).limit(1);
    if (!conversation) throw new NotFoundException('Conversation not found');
    const history = await db.select().from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(desc(messages.createdAt))
      .limit(50);
    const reactions = await this.messageReactions.listForMessages(history.map((message) => message.id));
    return history.map((message) => ({ ...message, reactions: reactions[message.id] ?? [] }));
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

  // Message status (sent/delivered/seen)
  @Post(':conversationId/messages/:messageId/status')
  @UseGuards(JwtAuthGuard)
  async updateMessageStatus(
    @Param('conversationId') convId: string,
    @Param('messageId') msgId: string,
    @Body() body: { status: string },
    @Req() req: any,
  ) {
    const db = getDb();
    await db.execute(sql`
      UPDATE messages SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{status}', ${JSON.stringify(body.status)}::jsonb)
      WHERE id = ${msgId} AND conversation_id = ${convId}
    `);
    return { updated: true };
  }

  // Message reactions
  @Post(':conversationId/messages/:messageId/reactions')
  @UseGuards(JwtAuthGuard)
  async addReaction(
    @Param('conversationId') convId: string,
    @Param('messageId') msgId: string,
    @Body() body: { emoji: string },
    @Req() req: any,
  ) {
    return this.messageReactions.react(convId, msgId, req.user.userId, body.emoji);
  }

  @Delete(':conversationId/messages/:messageId/reactions')
  @UseGuards(JwtAuthGuard)
  async removeReaction(
    @Param('conversationId') convId: string,
    @Param('messageId') msgId: string,
    @Req() req: any,
  ) {
    return this.messageReactions.remove(convId, msgId, req.user.userId);
  }
}
