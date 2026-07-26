/**
 * Prompt System — modular prompt builders for all AI features.
 *
 * Each module builds a specific prompt segment:
 * - system.prompt.ts     — Core identity + behavioral constraints
 * - personality.prompt.ts — Traits, quirks, values, secrets
 * - messaging.prompt.ts   — Text length, style, emoji, slang rules
 * - memory.prompt.ts      — Memory injection + extraction prompts
 * - relationship.prompt.ts — Relationship dynamics + shared history
 * - story.prompt.ts       — Story generation + image prompts
 * - image.prompt.ts       — Image generation with identity consistency
 * - voice.prompt.ts       — Voice call behavior
 */

export { buildSystemPrompt, type SystemPromptParams } from './system.prompt';
export { buildPersonalityPrompt, type PersonalityPromptParams } from './personality.prompt';
export { buildMessagingPrompt, type MessagingPromptParams } from './messaging.prompt';
export { buildMemoryPrompt, buildMemoryExtractionPrompt, type MemoryPromptParams } from './memory.prompt';
export { buildRelationshipPrompt, type RelationshipPromptParams } from './relationship.prompt';
export { buildStoryPrompt, buildStoryImagePrompt, type StoryPromptParams } from './story.prompt';
export { buildImagePrompt, buildSelfiePrompt, buildReferenceImagePrompt, type ImagePromptParams } from './image.prompt';
export { buildVoicePrompt, buildVoiceCallSystemPrompt, type VoicePromptParams } from './voice.prompt';

/**
 * Build the complete chat prompt by assembling all modules.
 */
import { buildSystemPrompt, type SystemPromptParams } from './system.prompt';
import { buildPersonalityPrompt, type PersonalityPromptParams } from './personality.prompt';
import { buildMessagingPrompt, type MessagingPromptParams } from './messaging.prompt';
import { buildMemoryPrompt, type MemoryPromptParams } from './memory.prompt';
import { buildRelationshipPrompt, type RelationshipPromptParams } from './relationship.prompt';

export interface FullChatPromptParams {
  system: SystemPromptParams;
  personality: PersonalityPromptParams;
  messaging: MessagingPromptParams;
  memory: MemoryPromptParams;
  relationship: RelationshipPromptParams;
}

export function buildFullChatPrompt(params: FullChatPromptParams): string {
  return [
    buildSystemPrompt(params.system),
    buildPersonalityPrompt(params.personality),
    buildRelationshipPrompt(params.relationship),
    buildMemoryPrompt(params.memory),
    buildMessagingPrompt(params.messaging),
  ].join('\n');
}
