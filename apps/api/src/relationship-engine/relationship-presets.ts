export type RelationshipPresetName = 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'best_friend' | 'romantic' | 'soulmate' | 'conflict';

interface RelationshipPreset {
  visibleLevel: number;
  familiarity: number;
  trust: number;
  warmth: number;
  affinity: number;
  tension: number;
  comfort: number;
  attachment: number;
  curiosity: number;
  respect: number;
  chemistry: number;
  romance: number;
  humor: number;
  compatibility: number;
}

export const RELATIONSHIP_PRESETS: Record<RelationshipPresetName, RelationshipPreset> = {
  stranger: { visibleLevel: 1, familiarity: .03, trust: .02, warmth: .04, affinity: .03, tension: 0, comfort: .01, attachment: 0, curiosity: .18, respect: .08, chemistry: .04, romance: 0, humor: .02, compatibility: .05 },
  acquaintance: { visibleLevel: 3, familiarity: .25, trust: .18, warmth: .22, affinity: .2, tension: .05, comfort: .15, attachment: .08, curiosity: .4, respect: .25, chemistry: .15, romance: .02, humor: .22, compatibility: .2 },
  friend: { visibleLevel: 6, familiarity: .64, trust: .6, warmth: .7, affinity: .62, tension: .03, comfort: .58, attachment: .42, curiosity: .54, respect: .67, chemistry: .48, romance: .08, humor: .61, compatibility: .64 },
  close_friend: { visibleLevel: 8, familiarity: .86, trust: .84, warmth: .9, affinity: .82, tension: .02, comfort: .86, attachment: .72, curiosity: .7, respect: .88, chemistry: .72, romance: .12, humor: .84, compatibility: .82 },
  best_friend: { visibleLevel: 9, familiarity: .95, trust: .94, warmth: .96, affinity: .92, tension: .01, comfort: .95, attachment: .88, curiosity: .65, respect: .95, chemistry: .78, romance: .05, humor: .92, compatibility: .91 },
  romantic: { visibleLevel: 9, familiarity: .9, trust: .86, warmth: .94, affinity: .85, tension: .04, comfort: .88, attachment: .8, curiosity: .74, respect: .9, chemistry: .91, romance: .78, humor: .82, compatibility: .88 },
  soulmate: { visibleLevel: 10, familiarity: .98, trust: .98, warmth: .99, affinity: .96, tension: .01, comfort: .98, attachment: .95, curiosity: .6, respect: .98, chemistry: .96, romance: .85, humor: .94, compatibility: .95 },
  conflict: { visibleLevel: 3, familiarity: .68, trust: .22, warmth: .28, affinity: .42, tension: .84, comfort: .18, attachment: .38, curiosity: .25, respect: .34, chemistry: .22, romance: .08, humor: .18, compatibility: .3 },
};

export function buildRelationshipPresetUpdate(name: RelationshipPresetName) {
  const preset = RELATIONSHIP_PRESETS[name];
  return {
    ...Object.fromEntries(Object.entries(preset).map(([key, value]) => [key, String(value)])),
    metadata: { testOverride: true, preset: name },
    lastInteractionAt: new Date(),
    updatedAt: new Date(),
  } as Record<keyof RelationshipPreset, string> & {
    metadata: { testOverride: true; preset: RelationshipPresetName };
    lastInteractionAt: Date;
    updatedAt: Date;
  };
}
