/**
 * Prompt System — modular prompt builders for all AI features.
 *
 * Each module builds a specific prompt segment:
 * - system.prompt.ts          — Core identity + behavioral constraints
 * - emotion.prompt.ts          — Emotional state, mood, energy, time effects
 * - personality.prompt.ts      — Deep personality: traits, life stage, contradictions
 * - messaging.prompt.ts        — Natural texting: style, mood effects, time awareness
 * - memory.prompt.ts           — Memory injection + extraction prompts
 * - relationship.prompt.ts     — Relationship dynamics, leveling, history, milestones
 * - autonomy.prompt.ts         — Autonomous social media behavior (feed posts, stories)
 * - feed-reaction.prompt.ts    — Natural reactions to user posts
 * - roleplay-gating.prompt.ts  — Roleplay availability decisions (mood/trust gates)
 * - story-generation.prompt.ts — Story creation with smart photo reuse
 * - story.prompt.ts            — Legacy story generation prompts
 * - image.prompt.ts            — Image generation with identity consistency
 * - voice.prompt.ts            — Voice call behavior
 */

// ── Core prompts ────────────────────────────────────────────────────
export { buildSystemPrompt, type SystemPromptParams } from './system.prompt';
export { buildEmotionPrompt, type EmotionPromptParams } from './emotion.prompt';
export { buildPersonalityPrompt, type PersonalityPromptParams } from './personality.prompt';
export { buildMessagingPrompt, type MessagingPromptParams } from './messaging.prompt';
export { buildMemoryPrompt, buildMemoryExtractionPrompt, type MemoryPromptParams } from './memory.prompt';
export {
  buildRelationshipPrompt,
  buildRelationshipDeltaPrompt,
  buildRelationshipReflectionPrompt,
  type RelationshipPromptParams,
  type RelationshipDeltaParams,
} from './relationship.prompt';

// ── Autonomy & social presence ──────────────────────────────────────
export {
  buildAutonomyPrompt,
  buildAutonomyDecisionPrompt,
  type AutonomyPromptParams,
} from './autonomy.prompt';

// ── Feed reactions ──────────────────────────────────────────────────
export {
  buildFeedReactionPrompt,
  buildReactionEligibilityPrompt,
  type FeedReactionPromptParams,
} from './feed-reaction.prompt';

// ── Roleplay gating ─────────────────────────────────────────────────
export {
  buildRoleplayGatingPrompt,
  buildRoleplayExitPrompt,
  type RoleplayGatingPromptParams,
} from './roleplay-gating.prompt';

// ── Story generation ────────────────────────────────────────────────
export {
  buildStoryGenerationPrompt,
  buildQuickStoryCaptionPrompt,
  buildStoryDecisionPrompt,
  type StoryGenerationPromptParams,
} from './story-generation.prompt';

// ── Legacy / image / voice ──────────────────────────────────────────
export { buildStoryPrompt, buildStoryImagePrompt, type StoryPromptParams } from './story.prompt';
export { buildImagePrompt, buildSelfiePrompt, buildReferenceImagePrompt, type ImagePromptParams } from './image.prompt';
export { buildVoicePrompt, buildVoiceCallSystemPrompt, type VoicePromptParams } from './voice.prompt';

// ── Full chat prompt assembler ──────────────────────────────────────

import { buildSystemPrompt, type SystemPromptParams } from './system.prompt';
import { buildEmotionPrompt, type EmotionPromptParams } from './emotion.prompt';
import { buildPersonalityPrompt, type PersonalityPromptParams } from './personality.prompt';
import { buildMessagingPrompt, type MessagingPromptParams } from './messaging.prompt';
import { buildMemoryPrompt, type MemoryPromptParams } from './memory.prompt';
import { buildRelationshipPrompt, type RelationshipPromptParams } from './relationship.prompt';

export interface FullChatPromptParams {
  system: SystemPromptParams;
  emotion: EmotionPromptParams;
  personality: PersonalityPromptParams;
  messaging: MessagingPromptParams;
  memory: MemoryPromptParams;
  relationship: RelationshipPromptParams;
}

export function buildFullChatPrompt(params: FullChatPromptParams): string {
  return [
    buildSystemPrompt(params.system),
    buildEmotionPrompt(params.emotion),
    buildPersonalityPrompt(params.personality),
    buildRelationshipPrompt(params.relationship),
    buildMemoryPrompt(params.memory),
    buildMessagingPrompt(params.messaging),
  ].join('\n');
}
