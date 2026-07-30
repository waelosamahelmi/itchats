import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReactionBar } from './ReactionBar';
import { MessageBubble } from './MessageBubble';
import { ChatComposer } from './ChatComposer';

describe('ReactionBar', () => {
  it('renders accessible reaction choices and marks the selected reaction', () => {
    const html = renderToStaticMarkup(<ReactionBar selected="❤️" onReact={() => undefined} />);
    expect(html).toContain('aria-label="React with ❤️"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-label="React with 🥹"');
  });
});

describe('ChatComposer', () => {
  it('labels primary media actions and exposes inline error feedback', () => {
    const html = renderToStaticMarkup(<ChatComposer
      characterName="Mara"
      value=""
      disabled={false}
      recording={false}
      recordingDuration={0}
      error="Voice notes need microphone access."
      onChange={() => undefined}
      onSend={() => undefined}
      onVoicePressStart={() => undefined}
      onVoicePressEnd={() => undefined}
      onImage={() => undefined}
    />);
    expect(html).toContain('aria-label="Attach a photo"');
    expect(html).toContain('aria-label="Hold to record voice note"');
    expect(html).toContain('role="alert"');
  });
});

describe('MessageBubble', () => {
  it('renders roleplay thoughts semantically and attributes character reactions', () => {
    const html = renderToStaticMarkup(<MessageBubble message={{
      id: 'message-1', sender: 'character', kind: 'thought', text: '**I remember this.**',
      createdAt: '2026-07-30T09:12:00.000Z', delivery: 'seen',
      reactions: [{ actorType: 'character', actorId: 'character-1', emoji: '🥹' }],
    }} onReact={() => undefined} />);
    expect(html).toContain('aria-label="Character thought"');
    expect(html).toContain('title="Character reacted"');
    expect(html).toContain('I remember this.');
  });
});
