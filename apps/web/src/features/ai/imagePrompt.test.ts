import { describe, expect, it } from 'vitest';
import { buildSelfiePrompt } from '../../../../../packages/ai-core/src/prompts/image.prompt';

const identity = {
  characterName: 'Mara',
  gender: 'woman',
  ageDisplay: 'late 20s',
  canonicalPrompt: 'Mara has a heart-shaped face, dark curls, amber eyes, and a small scar over her left eyebrow',
  selfieStyle: 'slightly grainy phone camera, warm practical lighting',
  wardrobe: 'charcoal knit sweater',
};

describe('buildSelfiePrompt', () => {
  it('anchors a natural selfie to canonical identity', () => {
    const prompt = buildSelfiePrompt(identity, 'casual_front_camera');
    expect(prompt).toContain(identity.canonicalPrompt);
    expect(prompt).toContain('front-camera selfie');
    expect(prompt).toContain('preserve the exact same face');
  });

  it('describes a physically coherent mirror selfie', () => {
    const prompt = buildSelfiePrompt(identity, 'mirror_selfie');
    expect(prompt).toContain('mirror selfie');
    expect(prompt).toContain('phone visible in the reflection');
    expect(prompt).toContain('no duplicate person');
  });
});
