import { describe, expect, it } from 'vitest';
import { RELATIONSHIP_PRESETS, buildRelationshipPresetUpdate } from './relationship-presets';

describe('relationship cheat presets', () => {
  it('keeps every relationship metric bounded and visible levels valid', () => {
    for (const preset of Object.values(RELATIONSHIP_PRESETS)) {
      expect(preset.visibleLevel).toBeGreaterThanOrEqual(1);
      expect(preset.visibleLevel).toBeLessThanOrEqual(10);
      for (const [key, value] of Object.entries(preset)) {
        if (key === 'visibleLevel') continue;
        expect(value, key).toBeGreaterThanOrEqual(0);
        expect(value, key).toBeLessThanOrEqual(1);
      }
    }
  });

  it('builds a test override without allowing relationship identity replacement', () => {
    const update = buildRelationshipPresetUpdate('close_friend');
    expect(update.metadata).toEqual({ testOverride: true, preset: 'close_friend' });
    expect(update).not.toHaveProperty('characterId');
    expect(update).not.toHaveProperty('userId');
    expect(update.visibleLevel).toBe('8');
  });
});
