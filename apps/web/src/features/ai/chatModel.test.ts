import { describe, expect, it } from 'vitest';
import { normalizeHistoryMessage, responsePartsToMessages } from './chatModel';

describe('normalizeHistoryMessage', () => {
  it('preserves media, delivery state, and attributed reactions', () => {
    const message = normalizeHistoryMessage({
      id: 'message-1',
      senderType: 'character',
      type: 'voice_note',
      content: 'I wanted you to hear this.',
      createdAt: '2026-07-30T09:12:00.000Z',
      metadata: { audioUrl: 'https://media.example/voice.webm', status: 'seen' },
      reactions: [
        { actorType: 'user', actorId: 'user-1', emoji: '❤️' },
        { actorType: 'character', actorId: 'character-1', emoji: '🥹' },
      ],
    });

    expect(message).toEqual({
      id: 'message-1',
      sender: 'character',
      kind: 'voice_note',
      text: 'I wanted you to hear this.',
      mediaUrl: 'https://media.example/voice.webm',
      createdAt: '2026-07-30T09:12:00.000Z',
      delivery: 'seen',
      reactions: [
        { actorType: 'user', actorId: 'user-1', emoji: '❤️' },
        { actorType: 'character', actorId: 'character-1', emoji: '🥹' },
      ],
    });
  });
});

describe('responsePartsToMessages', () => {
  const parts = [
    { type: 'thought' as const, content: 'I hope they noticed I remembered.' },
    { type: 'action' as const, content: 'leans closer to the camera' },
    { type: 'speech' as const, content: 'Of course I remembered.' },
  ];

  it('omits private thoughts and narration in chat mode', () => {
    expect(responsePartsToMessages(parts, 'chat', 'character-1')).toEqual([
      expect.objectContaining({ kind: 'text', text: 'Of course I remembered.' }),
    ]);
  });

  it('renders thoughts and actions distinctly in roleplay mode', () => {
    expect(responsePartsToMessages(parts, 'roleplay', 'character-1')).toEqual([
      expect.objectContaining({ kind: 'thought', text: '**I hope they noticed I remembered.**' }),
      expect.objectContaining({ kind: 'action', text: '*leans closer to the camera*' }),
      expect.objectContaining({ kind: 'text', text: 'Of course I remembered.' }),
    ]);
  });
});
