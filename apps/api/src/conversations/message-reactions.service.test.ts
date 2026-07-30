import { describe, expect, it } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessageReactionsService, type MessageReactionsRepository } from './message-reactions.service';

function repository(overrides: Partial<MessageReactionsRepository> = {}): MessageReactionsRepository {
  return {
    canAccessMessage: async () => true,
    upsertUserReaction: async (input) => ({
      id: 'reaction-1', actorType: 'user', actorId: input.userId, emoji: input.emoji,
    }),
    removeUserReaction: async () => true,
    ...overrides,
  };
}

describe('MessageReactionsService', () => {
  it('upserts one attributed reaction after checking conversation access', async () => {
    const calls: string[] = [];
    const service = new MessageReactionsService(repository({
      canAccessMessage: async ({ conversationId, messageId, userId }) => {
        calls.push(`access:${conversationId}:${messageId}:${userId}`);
        return true;
      },
      upsertUserReaction: async ({ messageId, userId, emoji }) => {
        calls.push(`upsert:${messageId}:${userId}:${emoji}`);
        return { id: 'reaction-1', actorType: 'user', actorId: userId, emoji };
      },
    }));

    const reaction = await service.react('conversation-1', 'message-1', 'user-1', '❤️');

    expect(reaction).toEqual({ id: 'reaction-1', actorType: 'user', actorId: 'user-1', emoji: '❤️' });
    expect(calls).toEqual([
      'access:conversation-1:message-1:user-1',
      'upsert:message-1:user-1:❤️',
    ]);
  });

  it('rejects unsupported reaction values before writing', async () => {
    const service = new MessageReactionsService(repository());
    await expect(service.react('conversation-1', 'message-1', 'user-1', 'not-an-emoji'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not reveal messages outside the user conversation', async () => {
    const service = new MessageReactionsService(repository({ canAccessMessage: async () => false }));
    await expect(service.remove('conversation-1', 'message-1', 'user-1'))
      .rejects.toBeInstanceOf(NotFoundException);
  });
});
