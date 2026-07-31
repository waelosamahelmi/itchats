import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UseGuards, NotFoundException, Inject, Logger, InternalServerErrorException } from '@nestjs/common';

import { getDb } from '@itchats/database';
import { conversations, messages, characters, conversationParticipants } from '@itchats/database/schema';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { SendMessageSchema } from '@itchats/contracts';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { MessageReactionsService } from './message-reactions.service';

@Controller('v1/conversations')
export class ConversationsController {
  private readonly logger = new Logger(ConversationsController.name);

  constructor(@Inject(MessageReactionsService) private readonly messageReactions: MessageReactionsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Req() req: any) {
    try {
      const db = getDb();

      // Latest message per conversation via a ROW_NUMBER window subquery (single query, no N+1)
      const lastMsg = db.select({
        conversationId: messages.conversationId,
        msgId: messages.id,
        msgContent: messages.content,
        msgType: messages.type,
        msgSenderType: messages.senderType,
        msgCreatedAt: messages.createdAt,
        rn: sql<number>`row_number() over (partition by ${messages.conversationId} order by ${messages.createdAt} desc)`.as('rn'),
      }).from(messages)
        .where(isNull(messages.deletedAt))
        .as('last_msg');

      const rows = await db.select({
        id: conversations.id,
        type: conversations.type,
        mode: conversations.mode,
        characterId: conversations.characterId,
        title: conversations.title,
        lastMessageAt: conversations.lastMessageAt,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        characterName: characters.name,
        characterAvatarUrl: characters.avatarUrl,
        mutedUntil: conversationParticipants.mutedUntil,
        lastMsgId: lastMsg.msgId,
        lastMsgContent: lastMsg.msgContent,
        lastMsgType: lastMsg.msgType,
        lastMsgSenderType: lastMsg.msgSenderType,
        lastMsgCreatedAt: lastMsg.msgCreatedAt,
        unreadCount: sql<number>`(
          SELECT count(*)::int FROM messages m
          WHERE m.conversation_id = ${conversations.id}
            AND m.sender_type = 'character'
            AND m.deleted_at IS NULL
            AND (
              ${conversationParticipants.lastReadMessageId} IS NULL
              OR m.created_at > (SELECT created_at FROM messages WHERE id = ${conversationParticipants.lastReadMessageId})
            )
        )`,
      }).from(conversations)
        .leftJoin(characters, eq(conversations.characterId, characters.id))
        .leftJoin(conversationParticipants, and(
          eq(conversationParticipants.conversationId, conversations.id),
          eq(conversationParticipants.userId, req.user.userId),
        ))
        .leftJoin(lastMsg, and(
          eq(lastMsg.conversationId, conversations.id),
          eq(lastMsg.rn, 1),
        ))
        .where(and(
          eq(conversations.createdByUserId, req.user.userId),
          isNull(conversations.deletedAt),
        ))
        .orderBy(desc(sql`COALESCE(${conversations.lastMessageAt}, ${conversations.createdAt})`))
        .limit(50);

      const previewFor = (type: string | null, content: string | null): string => {
        switch (type) {
          case 'voice_note':
          case 'audio':
            return '🎤 Voice message';
          case 'image':
            return '📷 Photo';
          case 'video':
            return '🎬 Video';
          default: {
            const text = (content || '').trim();
            return text.length > 140 ? `${text.slice(0, 140)}…` : text;
          }
        }
      };

      return rows.map((row) => ({
        conversationId: row.id,
        // Legacy aliases kept for existing clients
        id: row.id,
        type: row.type,
        mode: row.mode,
        characterId: row.characterId,
        title: row.title,
        lastMessageAt: row.lastMessageAt,
        characterName: row.characterName,
        character: row.characterId ? {
          id: row.characterId,
          name: row.characterName,
          avatarUrl: row.characterAvatarUrl,
        } : null,
        lastMessage: row.lastMsgId ? {
          id: row.lastMsgId,
          content: previewFor(row.lastMsgType, row.lastMsgContent),
          senderType: row.lastMsgSenderType,
          createdAt: row.lastMsgCreatedAt,
        } : null,
        unreadCount: Number(row.unreadCount) || 0,
        mutedUntil: row.mutedUntil,
        updatedAt: row.updatedAt,
      }));
    } catch (err: any) {
      this.logger.error('Failed to list conversations', err?.message || err);
      throw new InternalServerErrorException('Failed to load conversations');
    }
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
    // Find the latest message in this conversation
    const [latestMsg] = await db.select({ id: messages.id }).from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    if (latestMsg) {
      // Upsert participant record using raw SQL (table lacks a primary key)
      await db.execute(sql`
        INSERT INTO conversation_participants (conversation_id, user_id, last_read_message_id, joined_at)
        VALUES (${id}, ${req.user.userId}, ${latestMsg.id}, NOW())
        ON CONFLICT (conversation_id, user_id) DO UPDATE SET last_read_message_id = ${latestMsg.id}
      `);
    }

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

  // ── Conversation Settings (mute, proactive messages) ──
  @Patch(':conversationId/settings')
  @UseGuards(JwtAuthGuard)
  async updateSettings(
    @Param('conversationId') id: string,
    @Body() body: { mutedUntil?: string | null; proactiveMessagesEnabled?: boolean },
    @Req() req: any,
  ) {
    const db = getDb();

    // Verify ownership
    const [conv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.createdByUserId, req.user.userId)))
      .limit(1);
    if (!conv) throw new NotFoundException('Conversation not found');

    // Build update payload for conversation_participants
    const updates: Record<string, any> = {};

    if (body.mutedUntil !== undefined) {
      updates.mutedUntil = body.mutedUntil ? new Date(body.mutedUntil) : null;
    }

    if (body.proactiveMessagesEnabled !== undefined) {
      // Store proactive setting in participant metadata or a new column
      // For now, store as part of metadata jsonb if available
      // We'll use mutedUntil=far-future as a proxy for now
      if (!body.proactiveMessagesEnabled) {
        // Disable proactive by setting muted far in future
        if (!updates.mutedUntil && body.mutedUntil === undefined) {
          updates.mutedUntil = new Date('2099-12-31T23:59:59Z');
        }
      }
    }

    // Upsert participant record
    await db.execute(sql`
      INSERT INTO conversation_participants (conversation_id, user_id, muted_until)
      VALUES (${id}, ${req.user.userId}, ${updates.mutedUntil || null})
      ON CONFLICT (conversation_id, user_id) 
      DO UPDATE SET muted_until = ${updates.mutedUntil === undefined ? sql`conversation_participants.muted_until` : sql`${updates.mutedUntil}`}
    `);

    return {
      conversationId: id,
      mutedUntil: body.mutedUntil || null,
      proactiveMessagesEnabled: body.proactiveMessagesEnabled ?? true,
    };
  }
}
