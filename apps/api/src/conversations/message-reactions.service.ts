import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { conversationParticipants, conversations, messageReactions, messages } from '@itchats/database/schema';
import { and, eq, inArray, or } from 'drizzle-orm';

export const MESSAGE_REACTIONS_REPOSITORY = Symbol('MESSAGE_REACTIONS_REPOSITORY');
export const ALLOWED_REACTIONS = ['❤️', '😂', '😮', '🥹', '🔥', '👍'] as const;

export interface ReactionView {
  id: string;
  actorType: 'user' | 'character';
  actorId: string;
  emoji: string;
}

export interface MessageReactionsRepository {
  canAccessMessage(input: { conversationId: string; messageId: string; userId: string }): Promise<boolean>;
  upsertUserReaction(input: { messageId: string; userId: string; emoji: string }): Promise<ReactionView>;
  removeUserReaction(input: { messageId: string; userId: string }): Promise<boolean>;
  listForMessages?(messageIds: string[]): Promise<Record<string, ReactionView[]>>;
}

@Injectable()
export class DrizzleMessageReactionsRepository implements MessageReactionsRepository {
  async canAccessMessage({ conversationId, messageId, userId }: { conversationId: string; messageId: string; userId: string }) {
    const db = getDb();
    const [row] = await db.select({ id: messages.id }).from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .leftJoin(conversationParticipants, and(
        eq(conversationParticipants.conversationId, conversations.id),
        eq(conversationParticipants.userId, userId),
      ))
      .where(and(
        eq(messages.id, messageId),
        eq(messages.conversationId, conversationId),
        or(eq(conversations.createdByUserId, userId), eq(conversationParticipants.userId, userId)),
      )).limit(1);
    return Boolean(row);
  }

  async upsertUserReaction({ messageId, userId, emoji }: { messageId: string; userId: string; emoji: string }) {
    const db = getDb();
    const [row] = await db.insert(messageReactions).values({
      messageId, actorType: 'user', actorUserId: userId, emoji,
    }).onConflictDoUpdate({
      target: [messageReactions.messageId, messageReactions.actorUserId],
      set: { emoji, updatedAt: new Date() },
    }).returning();
    return { id: row!.id, actorType: 'user' as const, actorId: userId, emoji: row!.emoji };
  }

  async removeUserReaction({ messageId, userId }: { messageId: string; userId: string }) {
    const db = getDb();
    const rows = await db.delete(messageReactions).where(and(
      eq(messageReactions.messageId, messageId),
      eq(messageReactions.actorUserId, userId),
    )).returning({ id: messageReactions.id });
    return rows.length > 0;
  }

  async listForMessages(messageIds: string[]) {
    if (messageIds.length === 0) return {};
    const rows = await getDb().select().from(messageReactions)
      .where(inArray(messageReactions.messageId, messageIds));
    return rows.reduce<Record<string, ReactionView[]>>((grouped, row) => {
      const actorId = row.actorUserId ?? row.actorCharacterId;
      if (!actorId) return grouped;
      (grouped[row.messageId] ??= []).push({ id: row.id, actorType: row.actorType, actorId, emoji: row.emoji });
      return grouped;
    }, {});
  }
}

@Injectable()
export class MessageReactionsService {
  constructor(@Inject(MESSAGE_REACTIONS_REPOSITORY) private readonly repository: MessageReactionsRepository) {}

  async react(conversationId: string, messageId: string, userId: string, emoji: string) {
    if (!(ALLOWED_REACTIONS as readonly string[]).includes(emoji)) {
      throw new ForbiddenException('Unsupported reaction');
    }
    await this.assertAccess(conversationId, messageId, userId);
    return this.repository.upsertUserReaction({ messageId, userId, emoji });
  }

  async remove(conversationId: string, messageId: string, userId: string) {
    await this.assertAccess(conversationId, messageId, userId);
    return { removed: await this.repository.removeUserReaction({ messageId, userId }) };
  }

  async listForMessages(messageIds: string[]): Promise<Record<string, ReactionView[]>> {
    return this.repository.listForMessages?.(messageIds) ?? {};
  }

  private async assertAccess(conversationId: string, messageId: string, userId: string) {
    if (!await this.repository.canAccessMessage({ conversationId, messageId, userId })) {
      throw new NotFoundException('Message not found');
    }
  }
}
