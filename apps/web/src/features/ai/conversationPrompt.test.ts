import { describe, expect, it } from 'vitest';
import { buildSystemPrompt } from '../../../../../packages/ai-core/src/prompts/system.prompt';

const base = {
  characterName: 'Mara',
  personality: 'dry, observant, quietly warm',
  backstory: 'A night-shift radio host.',
  relationshipLabel: 'Friend',
  relationshipLevel: 6,
  trust: 0.62,
  warmth: 0.71,
  familiarity: 0.58,
  currentMood: 'calm',
  energyLevel: 4,
};

describe('conversation mode prompt contract', () => {
  it('keeps chat responses phone-like and forbids thoughts and narration', () => {
    const prompt = buildSystemPrompt({ ...base, conversationMode: 'chat' });

    expect(prompt).toContain('PHONE CHAT MODE');
    expect(prompt).toContain('Never output private thoughts, actions, or scene narration');
    expect(prompt).toContain('"type":"speech"');
  });

  it('allows structured thoughts and actions only in roleplay', () => {
    const prompt = buildSystemPrompt({ ...base, conversationMode: 'roleplay' });

    expect(prompt).toContain('LIVE ROLEPLAY MODE');
    expect(prompt).toContain('"type":"thought"');
    expect(prompt).toContain('"type":"action"');
  });
});
