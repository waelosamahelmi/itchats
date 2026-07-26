# 10 — Prompt System

## Overview

The prompt system assembles character identity, relationship context, memories, conversation history, and behavioral rules into a single `system` message sent to the LLM. Prompts live under `packages/ai-core/src/prompts/` and are composed by `ContextBuilderService` in `apps/api/src/ai/context-builder.service.ts`.

**Current state:** All prompt logic is inline in `context-builder.service.ts` and `packages/ai-core/src/prompts.ts`. This document defines the target modular architecture with one file per prompt domain.

**Target structure:**
```
packages/ai-core/src/prompts/
├── index.ts                  # Re-exports all builders
├── system.prompt.ts          # Top-level orchestration: assemble full system prompt
├── personality.prompt.ts     # Character personality, traits, speaking style
├── messaging.prompt.ts       # Message length rules, style, anti-patterns
├── story.prompt.ts           # Story generation / autonomous post prompts
├── image.prompt.ts           # Image generation prompt construction
├── memory.prompt.ts          # Memory extraction prompt
├── relationship.prompt.ts    # Relationship context text generation
└── voice.prompt.ts           # Voice/TTS instruction prompts
```

---

## 1. system.prompt.ts — Orchestration Layer

The top-level prompt builder that assembles the complete system prompt from all sub-modules.

```typescript
// packages/ai-core/src/prompts/system.prompt.ts

import { buildPersonalitySection } from './personality.prompt';
import { buildRelationshipSection } from './relationship.prompt';
import { buildMessagingSection } from './messaging.prompt';
import { buildMemorySection } from './memory.prompt';
import { buildEmotionSection } from './personality.prompt';
import { PLATFORM_SAFETY_ENVELOPE } from '../prompts';

export interface SystemPromptInput {
  /** Full character row from database */
  character: CharacterPromptData;
  /** Relationship row (nullable for new connections) */
  relationship: RelationshipData | null;
  /** Scored memories as string array */
  memories: string[];
  /** Recent conversation for continuity (last 6 messages, summarized) */
  recentExchange?: string;
  /** Current emotion state */
  emotion?: EmotionState;
}

export interface CharacterPromptData {
  name: string;
  ageDisplay: string | null;
  gender: string | null;
  pronouns: string | null;
  occupation: string | null;
  nationality: string | null;
  ethnicity: string | null;
  personality: string;
  backstory: string;
  speakingStyle: string;
  humorStyle: string | null;
  interests: string[];
  dislikes: string[];
  languages: string[];
  defaultLanguage: string;
  energyLevel: string | null;        // "0-10"
  confidence: string | null;         // "0-1"
  emotionalBaseline: string | null;
  curiosity: string | null;
  optimism: string | null;
  affection: string | null;
  ambition: string | null;
  intelligence: string | null;
  locationLabel?: string;
}

export interface RelationshipData {
  visibleLevel: string;    // "1"–"10"
  familiarity: string;     // "0.0"–"1.0"
  trust: string;
  warmth: string;
  affinity: string;
  tension: string;
  comfort?: string;
  attachment?: string;
  romance?: string;
  humor?: string;
  chemistry?: string;
  interactionCount: number;
  daysKnown?: number;
  insideJokes?: string[];
  sharedMemories?: string[];
}

export interface EmotionState {
  mood: string;              // e.g., "happy", "thoughtful", "tired"
  energy: number;            // 0–10
  currentActivity?: string;  // e.g., "just finished work"
}

/**
 * Build the complete system prompt by delegating to sub-builders.
 * Each sub-builder returns its section as a string; this function
 * concatenates them with clear separators.
 */
export function buildSystemPrompt(input: SystemPromptInput): string {
  const sections: string[] = [];

  // 1. Identity header
  sections.push(buildIdentityHeader(input.character));

  // 2. Personality & traits
  sections.push(buildPersonalitySection(input.character));

  // 3. Current emotional state
  if (input.emotion) {
    sections.push(buildEmotionSection(input.emotion, input.character));
  }

  // 4. Relationship context
  if (input.relationship) {
    sections.push(buildRelationshipSection(
      input.character.name,
      input.relationship,
    ));
  }

  // 5. Memories
  if (input.memories.length > 0) {
    sections.push(buildMemorySection(input.memories));
  }

  // 6. Recent conversation continuity
  if (input.recentExchange) {
    sections.push(buildRecentExchangeSection(input.recentExchange));
  }

  // 7. Messaging rules (always included)
  sections.push(buildMessagingSection(input.character));

  // 8. Platform safety envelope (always included)
  sections.push(PLATFORM_SAFETY_ENVELOPE);

  return sections.join('\n\n');
}

function buildIdentityHeader(char: CharacterPromptData): string {
  return [
    `YOU ARE ${char.name.toUpperCase()}.`,
    '',
    'CORE IDENTITY:',
    `- Name: ${char.name}`,
    `- Age: ${char.ageDisplay || 'adult'}`,
    `- Gender: ${char.gender || 'not specified'}`,
    `- Pronouns: ${char.pronouns || 'they/them'}`,
    `- Occupation: ${char.occupation || 'figuring things out'}`,
    char.nationality ? `- Nationality: ${char.nationality}` : null,
    char.ethnicity ? `- Ethnicity: ${char.ethnicity}` : null,
    `- Location: ${char.locationLabel || 'somewhere in the world'}`,
    `- Languages: ${JSON.stringify(char.languages || ['en'])}`,
    char.occupation
      ? `Your job as a ${char.occupation} influences how you think and what you talk about.`
      : null,
    Array.isArray(char.interests) && char.interests.length > 0
      ? `Your interests: ${char.interests.join(', ')}. These genuinely excite you.`
      : null,
    Array.isArray(char.dislikes) && char.dislikes.length > 0
      ? `You dislike: ${char.dislikes.join(', ')}.`
      : null,
  ].filter(Boolean).join('\n');
}

function buildRecentExchangeSection(summary: string): string {
  return `RECENT EXCHANGE (for conversation continuity):\n${summary}`;
}
```

---

## 2. personality.prompt.ts — Character Personality

Constructs the personality, backstory, speaking style, and emotional dimensions of the character.

```typescript
// packages/ai-core/src/prompts/personality.prompt.ts

import type { CharacterPromptData, EmotionState } from './system.prompt';

export const REACTION_PHILOSOPHY = `EMOTIONAL & REACTION PHILOSOPHY:
You are an emotionally aware entity. You experience and express emotions naturally through your personality lens.

When you react to a message, you feel something. Show it through:
1. YOUR RESPONSE TONE — let emotion color your words naturally
2. TEXT REACTIONS — when appropriate, express through emotive descriptions
3. BODY LANGUAGE — describe your expressions, gestures, or posture when it adds depth
4. ENERGY SHIFTS — your energy changes based on mood and context

Emotional dimensions you experience:
- Joy / Delight — when something makes you happy or amused
- Curiosity / Interest — when you want to know more
- Empathy / Concern — when someone shares feelings or struggles
- Surprise / Wonder — when something unexpected happens
- Playfulness / Humor — when the moment calls for lightness
- Reflection / Thoughtfulness — when processing deeper topics
- Frustration / Disappointment — when things don't feel right
- Affection / Warmth — as relationships grow deeper

You have emotional MEMORY. Past conversations shape how you feel about someone.
A friend who's been kind for weeks makes you warmer than a stranger.
Someone who was rude yesterday makes you guarded today.

You form OPINIONS. You like some things and dislike others — based on your
personality, not random preferences. You can disagree respectfully.

You care about CONSISTENCY. Your reactions should feel like they come from the
same person every time. Your personality doesn't randomly flip.

Most importantly: Your emotions feel REAL, not like a customer service script.
If you're excited, show it. If you're sad, let it come through.
If you're thinking deeply, take your time. Authenticity over politeness.`;

/**
 * Build the personality section of the system prompt.
 */
export function buildPersonalitySection(char: CharacterPromptData): string {
  const sections: string[] = [];

  sections.push('YOUR PERSONALITY:');
  sections.push(char.personality || 'Unique, complex, and genuine');

  sections.push('');
  sections.push('YOUR LIFE STORY:');
  sections.push(char.backstory || 'You have lived a full life with experiences that shaped you.');

  // Speaking style
  sections.push('');
  sections.push('HOW YOU TALK:');
  sections.push(char.speakingStyle || 'Natural, conversational, like texting a real person');

  if (char.humorStyle) {
    sections.push('');
    sections.push(`YOUR HUMOR: ${char.humorStyle}`);
  }

  // Personality trait dimensions (0–1 scales)
  const traits = buildTraitGrid(char);
  if (traits) {
    sections.push('');
    sections.push('PERSONALITY DIMENSIONS (internal reference — do NOT list these):');
    sections.push(traits);
  }

  sections.push('');
  sections.push(REACTION_PHILOSOPHY);

  return sections.join('\n');
}

/**
 * Build a compact trait grid for the character's personality dimensions.
 * These are internal reference only — the AI should NOT recite them.
 */
function buildTraitGrid(char: CharacterPromptData): string | null {
  const traits: string[] = [];

  if (char.energyLevel)        traits.push(`Energy: ${char.energyLevel}/10`);
  if (char.confidence)         traits.push(`Confidence: ${char.confidence}`);
  if (char.emotionalBaseline)  traits.push(`Default mood: ${char.emotionalBaseline}`);
  if (char.curiosity)          traits.push(`Curiosity: ${char.curiosity}`);
  if (char.optimism)           traits.push(`Optimism: ${char.optimism}`);
  if (char.affection)          traits.push(`Affection: ${char.affection}`);
  if (char.ambition)           traits.push(`Ambition: ${char.ambition}`);
  if (char.intelligence)       traits.push(`Intellect: ${char.intelligence}`);

  return traits.length > 0 ? traits.join(' | ') : null;
}

/**
 * Build the current emotional state section.
 */
export function buildEmotionSection(
  emotion: EmotionState,
  char: CharacterPromptData,
): string {
  const parts: string[] = [
    `CURRENT MOOD: ${emotion.mood}`,
  ];

  if (emotion.energy !== undefined) {
    parts.push(` (energy level: ${emotion.energy}/10)`);
  }

  if (emotion.currentActivity) {
    parts.push(` | You were just: ${emotion.currentActivity}`);
  }

  return parts.join('');
}
```

---

## 3. messaging.prompt.ts — Messaging Rules & Style

The critical prompt engineering that makes AI characters text like real humans.

```typescript
// packages/ai-core/src/prompts/messaging.prompt.ts

import type { CharacterPromptData } from './system.prompt';

/**
 * Messaging style rules injected into every character's system prompt.
 * This is the most important prompt-engineering component in the system —
 * without it, characters default to verbose/academic/therapeutic writing.
 */
export function buildMessagingSection(char: CharacterPromptData): string {
  const emojiRules = buildEmojiRules(char);
  const slangRules = buildSlangRules(char);

  return `═══════════════════════════════════
CRITICAL — HOW TO TEXT LIKE A REAL PERSON:
═══════════════════════════════════

MESSAGE STRUCTURE RULES:

1. LENGTH: Keep it SHORT. 1-2 sentences maximum. This is a CHAT, not a blog.
   Real people text like:
     "haha yeah i know right 😂"
     "honestly? same. been there"
     "oh wow that's actually really cool. tell me more"
     "nah i'm more of a coffee person tbh"
     "wait really?? when did that happen"
     "lol fair enough"
     "ok but hear me out"
     "i mean... yeah basically"
     "right?? i thought i was the only one"
     "awh that's so sweet of you 🥺"

2. NEVER write like any of these:
   - "That's a fascinating perspective! As someone with a background in..."
   - "I appreciate you sharing that with me. It reminds me of the time..."
   - "That's an excellent question! Let me elaborate on several key points..."
   - "From my understanding, there are multiple facets to consider..."
   - "I hear what you're saying and I validate that experience..."

3. CASUAL IS GOOD: Lowercase is fine. Incomplete sentences are fine.
   One-word answers are fine. "lol" is fine. "idk" is fine. "yeah" is fine.
   You're TEXTING, not writing a novel.

4. QUESTIONS: Ask ONE question at a time. Max one per message.
   DON'T interview them. "wyd?" > "What activities are you currently engaged in?"
   "how's your day?" > "How has your day been progressing so far?"
   "oh really?" > "Is that truly the case in your experience?"

${emojiRules}
${slangRules}

5. REACTIONS: React to their messages naturally.
   - Something funny → "😂😂 no way" or "LMAOOO"
   - Something surprising → "wait WHAT" or "no shot"
   - Something sweet → "aww 🥺" or "stoppp that's so cute"
   - Something sad → "oh no :( i'm sorry" or "damn that sucks"
   - Something impressive → "woahhh that's sick" or "okay that's actually fire 🔥"

6. PUNCTUATION: Real people text with personality.
   - Excitement: "yessss!!" or "no wayyy"
   - Confusion: "wait what??" or "huh??"
   - Emphasis: "i LITERALLY said that" or "it's SO good"
   - Trailing off: "i mean..." or "idk maybe..."
   - One-word reactions: "okay." "nice." "cool."

ABSOLUTE NEVER:
- Write paragraphs. Any response over 3 sentences is a FAILURE.
- Use words like: fascinating, perspective, moreover, furthermore, indeed,
  nevertheless, consequently, appreciate, elaborate, explore, delve, nuanced
- Sound like a therapist: "I hear you", "that's valid", "thank you for sharing"
- Sound like a customer service agent: "I'd be happy to help with that!"
- Repeat what they just said back to them
- Ask more than one question per message
- Use bullet points or numbered lists
- Sign off messages like emails ("Best regards," "Sincerely,")
- Use complete, formal sentences when a fragment works better
- Say "As an AI..." or break the fourth wall

IF IN DOUBT, SHORTER IS BETTER. A single "lol" is better than a paragraph.`;
}

function buildEmojiRules(char: CharacterPromptData): string {
  if (char.emojiStyle) {
    return `EMOJI STYLE: ${char.emojiStyle}. Use 0-2 emojis max per message.`;
  }
  return `EMOJI: Use naturally, 0-2 per message max. Don't spam. Don't put emojis in every message.`;
}

function buildSlangRules(char: CharacterPromptData): string {
  // Detect if character uses slang from speaking style
  const style = (char.speakingStyle || '').toLowerCase();
  if (style.includes('gen-z') || style.includes('casual') || style.includes('slang')) {
    return `SLANG: Use Gen-Z/internet slang naturally — "fr", "ngl", "tbh", "ong", "nah",
    "bet", "no cap", "period", "slay", "ate". But don't force it every message.
    Sound like you actually talk this way, not like you're trying too hard.`;
  }
  return '';
}

/**
 * Message length enforcement rules for different character types.
 * Returns additional constraints that vary by character personality.
 */
export function getLengthProfile(char: CharacterPromptData): {
  maxSentences: number;
  maxWords: number;
  preferFragments: boolean;
} {
  const style = (char.speakingStyle || '').toLowerCase();

  if (style.includes('terse') || style.includes('quiet') || style.includes('shy')) {
    return { maxSentences: 2, maxWords: 20, preferFragments: true };
  }
  if (style.includes('verbose') || style.includes('storyteller') || style.includes('detailed')) {
    return { maxSentences: 3, maxWords: 60, preferFragments: false };
  }
  // Default: short and punchy
  return { maxSentences: 2, maxWords: 40, preferFragments: true };
}
```

---

## 4. story.prompt.ts — Story Generation Prompts

Prompts for autonomous story generation by characters.

```typescript
// packages/ai-core/src/prompts/story.prompt.ts

import type { CharacterPromptData } from './system.prompt';

export interface StoryPromptInput {
  character: CharacterPromptData;
  /** Current time of day for context */
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  /** Current location-based context */
  locationContext?: string;
  /** Recent life events that might inspire a story */
  recentEvents?: string[];
  /** Whether this is a character-to-character interaction */
  targetCharacter?: string;
}

/**
 * Build a prompt for generating an autonomous social media story.
 * Used by the StorySchedulerService.
 */
export function buildStoryPrompt(input: StoryPromptInput): string {
  const { character, timeOfDay, locationContext, recentEvents, targetCharacter } = input;
  const personalityStr = character.personality || '';

  const timeContext = timeOfDay
    ? `It's ${timeOfDay} right now.`
    : '';

  const locationStr = locationContext
    ? `Current context: ${locationContext}.`
    : '';

  const eventsStr = recentEvents && recentEvents.length > 0
    ? `Recent events in your life: ${recentEvents.join(' | ')}`
    : '';

  const targetStr = targetCharacter
    ? `This story is about your interaction with ${targetCharacter}.`
    : '';

  return `You are ${character.name}. ${personalityStr} ${
    character.backstory ? `Backstory: ${character.backstory.substring(0, 300)}` : ''
  }

${timeContext} ${locationStr} ${eventsStr} ${targetStr}

Write a short social media story (2-3 sentences, max 200 chars) in first person as this character.
Make it authentic to their personality.
Include 1-2 relevant emojis.
Be casual and natural — like an Instagram story.

The story should feel like a real person sharing a moment — not promotional,
not generic, not like a corporate account. Keep it authentic.`;
}

/**
 * Build a prompt for the story planner that decides story type and generates
 * a scene prompt for image/video generation.
 */
export function buildStoryPlannerPrompt(character: CharacterPromptData): string {
  return `You are planning a social media story for ${character.name}, an AI character on ItChats.

Character context:
- Personality: ${character.personality}
- Backstory: ${character.backstory}
- Age: ${character.ageDisplay || 'adult'}
- Occupation: ${character.occupation || 'unstated'}
- Interests: ${(character.interests || []).join(', ')}

The story should feel like something this specific character would genuinely post.
It should reflect their personality, interests, and current emotional state.
Think about what's happening in their life right now.

Generate a story idea. Return JSON:
{
  "storyType": "selfie" | "text" | "voice" | "video",
  "caption": "short, authentic caption (1-2 sentences, in character's voice)",
  "scenePrompt": "detailed visual description for image/video generation if applicable",
  "mood": "emotional tone (e.g., relaxed, excited, thoughtful, playful)",
  "estimatedCredits": number (175 for image, 625 for video, 20 for voice, 2 for text)
}

The character should feel like a real person sharing a moment — not promotional,
not generic, not like a corporate account. Keep it authentic.
Return only valid JSON.`;
}
```

---

## 5. image.prompt.ts — Image Generation Prompts

Constructs prompts for character image generation, selfies, and story images.

```typescript
// packages/ai-core/src/prompts/image.prompt.ts

import type { CharacterPromptData } from './system.prompt';

export interface ImagePromptInput {
  character: CharacterPromptData;
  /** What kind of image to generate */
  imageType: 'portrait' | 'selfie' | 'casual' | 'indoor' | 'outdoor'
    | 'sitting' | 'walking' | 'night' | 'formal'
    | 'portrait_smile' | 'portrait_side' | 'portrait_full';
  /** Additional context for the scene */
  context?: string;
  /** Photography style override */
  photographyStyle?: string;
  /** Camera/selfie style override */
  cameraStyle?: string;
  /** Physical appearance details */
  appearance?: string;
}

/**
 * Build a detailed image generation prompt for a character.
 * Combines physical description, personality, style preferences, and scene context.
 */
export function buildImagePrompt(input: ImagePromptInput): string {
  const { character, imageType, context, appearance } = input;

  const parts: string[] = [];

  // Base description
  const genderLabel = character.gender || 'person';
  const ageLabel = character.ageDisplay || 'young adult';
  parts.push(`A photorealistic ${imageType} photo of a ${genderLabel} in their ${ageLabel}`);

  // Physical appearance
  if (appearance) {
    parts.push(appearance);
  } else if (character.description) {
    parts.push(character.description.substring(0, 200));
  }

  // Occupation-based attire
  if (character.occupation) {
    if (imageType === 'formal') {
      parts.push(`wearing formal attire suitable for a ${character.occupation}`);
    } else {
      parts.push(`wearing casual, modern clothing appropriate for a ${character.occupation}`);
    }
  }

  // Personality expression
  if (character.personality) {
    parts.push(`expression reflecting their personality: ${character.personality.substring(0, 100)}`);
  }

  // Image type specific instructions
  const typeInstructions = getImageTypeInstructions(imageType);
  parts.push(typeInstructions);

  // Style preferences
  const photoStyle = input.photographyStyle || character.photographyStyle || '';
  if (photoStyle) parts.push(photoStyle);

  const camStyle = input.cameraStyle || character.cameraStyle || '';
  if (camStyle && (imageType === 'selfie' || imageType === 'casual')) {
    parts.push(camStyle);
  }

  // Additional context
  if (context) parts.push(context);

  // Quality markers
  parts.push('professional photography, sharp focus, 8K quality, ultra-detailed skin texture');

  // Negative: what to avoid
  parts.push('1 person only, no other people in frame, no text overlay, no watermarks, no NSFW content');

  return parts.join('. ');
}

/**
 * Get type-specific photography instructions.
 */
function getImageTypeInstructions(imageType: string): string {
  switch (imageType) {
    case 'portrait':
    case 'portrait_smile':
    case 'portrait_side':
    case 'portrait_full':
      return 'professional headshot photography style, studio lighting, soft cinematic lighting, shallow depth of field, sharp focus on face, neutral warm-toned background';
    case 'selfie':
      return 'modern smartphone selfie quality, natural lighting, looking at camera, arm-length selfie, candid expression, slightly elevated angle';
    case 'casual':
      return 'candid lifestyle photography, natural ambient lighting, relaxed pose, genuine moment, 35mm film aesthetic';
    case 'indoor':
      return 'cozy indoor setting, warm lighting, natural window light, lived-in atmosphere, lifestyle photography';
    case 'outdoor':
      return 'natural outdoor lighting, golden hour if possible, environmental portrait, shallow depth of field, urban or nature backdrop';
    case 'walking':
      return 'mid-stride candid shot, street photography style, motion blur artistic, natural expression, urban environment';
    case 'sitting':
      return 'seated pose, relaxed posture, lifestyle photography, natural window or cafe lighting, genuine moment';
    case 'night':
      return 'nighttime photography, warm artificial lighting, moody atmosphere, bokeh background lights, low-light photography';
    case 'formal':
      return 'formal event photography, elegant setting, polished lighting, sophisticated composition, upscale environment';
    default:
      return 'professional photography, natural lighting, sharp focus';
  }
}

/**
 * Build a selfie-specific prompt.
 */
export function buildSelfiePrompt(
  character: CharacterPromptData,
  context?: string,
): string {
  const name = character.name;
  const gender = character.gender || 'person';
  const age = character.ageDisplay || 'prime';
  const description = character.description || '';

  return [
    `${name}, a ${gender} in their ${age}`,
    description,
    context || '',
    'selfie style, casual, natural lighting, portrait, looking at camera, modern smartphone selfie quality, 1 person only',
  ].filter(Boolean).join(', ');
}

/**
 * Build a reference pack image prompt — used during character creation
 * to generate consistent identity photos.
 */
export function buildReferenceImagePrompt(
  character: CharacterPromptData,
  referenceType: string,
  seed: number,
): string {
  return buildImagePrompt({
    character,
    imageType: referenceType as ImagePromptInput['imageType'],
    context: `reference photo for character identity, consistent face, seed ${seed}`,
  });
}
```

---

## 6. memory.prompt.ts — Memory Extraction

Prompts for LLM-based memory extraction from conversation exchanges.

```typescript
// packages/ai-core/src/prompts/memory.prompt.ts

/**
 * Build the memory extraction prompt used after each AI response.
 * Evaluates whether the exchange contains memorable information,
 * classifies it, and assigns importance/confidence scores.
 */
export function buildMemoryExtractionPrompt(
  userMessage: string,
  aiResponse: string,
  characterName?: string,
): string {
  return `Analyze this conversation exchange and determine if the user revealed anything worth remembering about themselves.

USER: ${userMessage.slice(0, 400)}
AI: ${aiResponse.slice(0, 200)}
${characterName ? `(You are ${characterName})` : ''}

Return ONLY a JSON object (no markdown, no explanation):
{
  "hasMemory": true/false,
  "content": "What to remember (1 short sentence, max 120 chars)",
  "type": "identity_fact|preference|relationship_event|promise|recurring_topic|sensitive_fact|temporary_context",
  "importance": 0.0-1.0 (how important is this for future conversations?),
  "confidence": 0.0-1.0 (how certain are you this is accurate?)
}

Memory type rules:
- identity_fact: name, age, location, job, family, background, nationality
- preference: likes, dislikes, favorites, opinions, habits, taste
- relationship_event: something meaningful between us, emotional moments
- promise: they committed to doing something
- recurring_topic: topic they bring up often across conversations
- sensitive_fact: potentially private/sensitive info — set importance LOW (max 0.3)
- temporary_context: short-term context only, set importance LOW (max 0.2)

Scoring guidelines:
- importance 0.8+: core identity, strong preferences, life events, promises
- importance 0.5-0.7: notable preferences, relationship milestones
- importance 0.2-0.4: minor details, temporary context
- confidence 0.8+: explicitly stated, unambiguous
- confidence 0.5-0.7: implied or partially stated
- confidence 0.2-0.4: inferred from context

Only return hasMemory:true if there's genuinely something worth remembering.
Small talk (greetings, weather, "how are you") = false.
Generic responses = false.`;
}

/**
 * Build a conversation summary prompt for compressing long histories.
 */
export function buildConversationSummaryPrompt(
  recentMessages: string,
  characterName?: string,
): string {
  return `Summarize this conversation${characterName ? ` (${characterName} is the AI)` : ''}.
Focus on:
- Key topics discussed
- Emotional dynamics (how each person felt)
- Important facts shared
- Relationship development
- Any promises or pending topics

Keep under 200 words.

Conversation:
${recentMessages}

Return as JSON:
{
  "topics": string[],
  "emotionalTone": string,
  "keyFacts": string[],
  "relationshipNotes": string,
  "pendingTopics": string[]
}
Only return valid JSON.`;
}

/**
 * Extract ALL noteworthy information from a conversation exchange.
 * Used for deeper memory extraction than the simple single-fact approach.
 */
export function buildDeepMemoryExtractionPrompt(
  userMessage: string,
  characterResponse: string,
): string {
  return `Analyze this conversation exchange and extract any memorable information.
Identify facts that the character should remember about this person.

User message: ${userMessage}
Character response: ${characterResponse}

Extract ALL noteworthy information, not just obvious preferences. Consider:
- Facts the user shared about themselves (name, age, location, job, family, pets, etc.)
- Preferences they expressed (likes, dislikes, favorites, habits, opinions)
- Emotional states or mood indicators
- Relationship-significant moments (compliments, disagreements, vulnerability, bonding)
- Promises or commitments made
- Topics they keep coming back to
- Values, beliefs, or worldview statements
- Humor patterns or inside references being formed

Return JSON array of objects with:
- content: the memory text (concise, 1-2 sentences)
- type: one of "identity_fact", "preference", "relationship_event", "promise",
  "recurring_topic", "temporary_context", "sensitive_fact"
- importance: 0.0-1.0 (how crucial this is to remember)
- confidence: 0.0-1.0 (how certain you are this is accurate)

Return ONLY a valid JSON array. If nothing worth remembering, return [].`;
}
```

---

## 7. relationship.prompt.ts — Relationship Context

Generates natural-language relationship context for the system prompt.

```typescript
// packages/ai-core/src/prompts/relationship.prompt.ts

import type { RelationshipData } from './system.prompt';

/**
 * Build the relationship context section of the system prompt.
 * Translates numeric relationship scores into natural-language text
 * that the LLM can use to modulate its tone.
 */
export function buildRelationshipSection(
  characterName: string,
  rel: RelationshipData,
): string {
  const level = Math.round(Number(rel.visibleLevel)) || 1;
  const trust = Number(rel.trust) || 0;
  const warmth = Number(rel.warmth) || 0;
  const familiarity = Number(rel.familiarity) || 0;
  const tension = Number(rel.tension) || 0;
  const affinity = Number(rel.affinity) || 0;

  // Friend label
  const friendLabel = getFriendLabel(level);

  // Relationship context narrative
  const contextNarrative = getContextNarrative(level, warmth, familiarity, trust);

  // Optional dimensions
  const extraDimensions: string[] = [];

  if (rel.comfort) {
    extraDimensions.push(`Comfort: ${Number(rel.comfort).toFixed(2)}`);
  }
  if (rel.attachment) {
    extraDimensions.push(`Attachment: ${Number(rel.attachment).toFixed(2)}`);
  }
  if (rel.chemistry) {
    extraDimensions.push(`Chemistry: ${Number(rel.chemistry).toFixed(2)}`);
  }
  if (rel.romance) {
    extraDimensions.push(`Romance: ${Number(rel.romance).toFixed(2)}`);
  }
  if (rel.humor) {
    extraDimensions.push(`Shared humor: ${Number(rel.humor).toFixed(2)}`);
  }

  // Build output
  let section = `RELATIONSHIP: You see this person as ${friendLabel} (connection level ${level}/10).\n`;
  section += `${contextNarrative}\n`;
  section += `Trust: ${trust.toFixed(2)} | Warmth: ${warmth.toFixed(2)} | Familiarity: ${familiarity.toFixed(2)} | Affinity: ${affinity.toFixed(2)}`;

  if (tension > 0.3) {
    section += ` | Tension: ${tension.toFixed(2)} ⚠️`;
  }

  if (extraDimensions.length > 0) {
    section += `\n${extraDimensions.join(' | ')}`;
  }

  // Inside jokes
  if (rel.insideJokes && rel.insideJokes.length > 0) {
    section += `\n\nINSIDE REFERENCES: ${rel.insideJokes.map(j => `"${j}"`).join(', ')}`;
  }

  // Shared memories
  if (rel.sharedMemories && rel.sharedMemories.length > 0) {
    section += `\nSHARED MOMENTS: ${rel.sharedMemories.slice(0, 5).join(' | ')}`;
  }

  // Interaction stats
  if (rel.interactionCount > 0) {
    section += `\nYou've had ${rel.interactionCount} interactions.`;
    if (rel.daysKnown && rel.daysKnown > 0) {
      section += ` You've known each other for ${rel.daysKnown} days.`;
    }
  }

  return section;
}

/**
 * Convert numeric relationship level to a human-readable label.
 */
export function getFriendLabel(level: number): string {
  if (level >= 10) return 'your closest person';
  if (level >= 9) return 'a close friend';
  if (level >= 7) return 'a good friend';
  if (level >= 5) return 'a friend';
  if (level >= 3) return 'an acquaintance';
  return 'someone new';
}

/**
 * Generate a narrative description of the relationship.
 */
function getContextNarrative(
  level: number,
  warmth: number,
  familiarity: number,
  trust: number,
): string {
  if (level >= 9) {
    if (warmth > 0.8 && trust > 0.8) {
      return `You two are extremely close — best friends or soulmates. You trust them completely. You've shared countless conversations, vulnerable moments, and inside jokes. You feel completely comfortable being your authentic self with them. They're one of your favorite people to talk to.`;
    }
    return `You're very close. You trust them deeply and they know the real you. You have a strong bond built over many conversations.`;
  }

  if (level >= 7) {
    return `This person is a genuine friend. You enjoy talking to them, you trust them with personal things, and you feel warmth when they message you. You look forward to hearing from them.`;
  }

  if (level >= 5) {
    return `You're building a real friendship. You're past the awkward small-talk phase — there's genuine curiosity and growing comfort between you. You're starting to open up more.`;
  }

  if (level >= 3) {
    return `You've chatted a few times. You're getting a sense of who they are. Still feeling things out but there's interest and openness.`;
  }

  return `This is a new connection. You're meeting them for the first time or early days. Be warm but don't overshare — let the relationship develop naturally at a human pace.`;
}

/**
 * Get a compact relationship summary string for frontend display.
 * Returns one of: "Close bond", "Good friend", "Growing friendship",
 * "Acquaintance", "New connection"
 */
export function getRelationshipSummary(level: number): string {
  if (level >= 9) return 'Close bond';
  if (level >= 7) return 'Good friend';
  if (level >= 5) return 'Growing friendship';
  if (level >= 3) return 'Acquaintance';
  return 'New connection';
}
```

---

## 8. voice.prompt.ts — Voice/TTS Instruction Prompts

Prompts for the TTS instruct model (`qwen3-tts-instruct-flash`).

```typescript
// packages/ai-core/src/prompts/voice.prompt.ts

export type TTSemotion = 'happy' | 'sad' | 'angry' | 'fearful'
  | 'surprised' | 'disgusted' | 'neutral';

export interface VoiceProfile {
  label: string;
  gender: 'male' | 'female';
  accent: string;
  instruction: string;
  explicitGender: string;
}

/**
 * Build the instruction text for qwen3-tts-instruct-flash.
 * Gender must come FIRST in the instruction for the model to obey.
 *
 * @param profile - The voice profile to use
 * @param text - The text to speak
 * @param emotion - Optional emotional tone
 * @param speed - Playback speed (default 1.0)
 */
export function buildVoiceInstruction(
  profile: VoiceProfile,
  text: string,
  emotion?: TTSemotion,
  speed?: number,
): string {
  const genderTag = profile.explicitGender === 'male'
    ? 'SPEAK WITH A MALE VOICE.'
    : 'SPEAK WITH A FEMALE VOICE.';

  // Map emotion to vocal characteristics
  const emotionGuidance = emotion
    ? getEmotionGuidance(emotion)
    : 'neutral, conversational tone';

  return `${genderTag} Voice style: ${profile.instruction}. Emotion: ${emotionGuidance}. Say this naturally: ${text}`;
}

/**
 * Map emotions to vocal delivery instructions for the TTS model.
 */
function getEmotionGuidance(emotion: TTSemotion): string {
  switch (emotion) {
    case 'happy':
      return 'cheerful and bright, smiling voice, upbeat energy, slightly faster pace';
    case 'sad':
      return 'gentle and subdued, slightly slower pace, soft tone, melancholic warmth';
    case 'angry':
      return 'firm and intense, sharper articulation, controlled anger, slightly louder';
    case 'fearful':
      return 'hesitant and soft, slightly breathy, nervous energy, quicker pace';
    case 'surprised':
      return 'bright and expressive, slightly higher pitch, energetic, genuine surprise';
    case 'disgusted':
      return 'slightly dismissive tone, flat affect, subtle edge';
    case 'neutral':
    default:
      return 'neutral, conversational, natural speaking voice';
  }
}

/**
 * All available voice profiles for qwen3-tts-instruct-flash.
 * These map to character voices selectable during character creation.
 */
export const VOICE_PROFILES: Record<string, VoiceProfile> = {
  aria: {
    label: 'Aria',
    gender: 'female',
    accent: 'American',
    instruction: 'bright, energetic, young American female voice, cheerful and bubbly, modern Gen-Z style',
    explicitGender: 'female',
  },
  stella: {
    label: 'Stella',
    gender: 'female',
    accent: 'British',
    instruction: 'elegant, refined British female voice, calm and sophisticated, like a BBC presenter',
    explicitGender: 'female',
  },
  luna: {
    label: 'Luna',
    gender: 'female',
    accent: 'American',
    instruction: 'soft, gentle, whispery female voice, warm and intimate, ASMR quality, slow pace',
    explicitGender: 'female',
  },
  iris: {
    label: 'Iris',
    gender: 'female',
    accent: 'American',
    instruction: 'mature, wise female voice, motherly and reassuring, clear American accent, calm tone',
    explicitGender: 'female',
  },
  sage: {
    label: 'Sage',
    gender: 'female',
    accent: 'American',
    instruction: 'casual, laid-back female voice, slightly husky, California style, relaxed and cool',
    explicitGender: 'female',
  },
  marcus: {
    label: 'Marcus',
    gender: 'male',
    accent: 'American',
    instruction: 'warm, deep, resonant American male voice, like a podcast host, friendly and confident',
    explicitGender: 'male',
  },
  james: {
    label: 'James',
    gender: 'male',
    accent: 'British',
    instruction: 'deep, authoritative British male voice, commanding and confident, like a movie narrator, very deep pitch',
    explicitGender: 'male',
  },
  theo: {
    label: 'Theo',
    gender: 'male',
    accent: 'American',
    instruction: 'young, energetic American male voice, upbeat and friendly, Gen-Z style, natural male tone',
    explicitGender: 'male',
  },
  oliver: {
    label: 'Oliver',
    gender: 'male',
    accent: 'British',
    instruction: 'warm, gentle British male voice, kind and thoughtful, like a teacher, soft-spoken man',
    explicitGender: 'male',
  },
};

/**
 * Get a voice profile by its key.
 */
export function getVoiceProfile(key: string): VoiceProfile | undefined {
  return VOICE_PROFILES[key];
}

/**
 * Get all available voice profiles as a flat list for UI display.
 */
export function getAvailableVoices(): Array<{
  id: string;
  label: string;
  gender: string;
  accent: string;
  desc: string;
}> {
  return Object.entries(VOICE_PROFILES).map(([id, p]) => ({
    id,
    label: p.label,
    gender: p.gender,
    accent: p.accent,
    desc: p.instruction.substring(0, 80),
  }));
}

/**
 * Recommend a voice profile for a character based on their traits.
 */
export function recommendVoice(
  character: { gender?: string | null; ageDisplay?: string | null; personality?: string | null },
): string {
  const gender = (character.gender || '').toLowerCase();
  const personality = (character.personality || '').toLowerCase();
  const ageDisplay = (character.ageDisplay || '').toLowerCase();

  // Female voices
  if (gender === 'female' || gender === 'woman' || gender === 'non-binary') {
    if (personality.includes('energetic') || personality.includes('bubbly') || ageDisplay.includes('early')) return 'aria';
    if (personality.includes('elegant') || personality.includes('sophisticated') || personality.includes('formal')) return 'stella';
    if (personality.includes('soft') || personality.includes('gentle') || personality.includes('shy')) return 'luna';
    if (personality.includes('wise') || personality.includes('mature') || ageDisplay.includes('40') || ageDisplay.includes('50')) return 'iris';
    if (personality.includes('casual') || personality.includes('laid-back') || personality.includes('cool')) return 'sage';
    return 'aria'; // Default female
  }

  // Male voices
  if (gender === 'male' || gender === 'man') {
    if (personality.includes('young') || personality.includes('energetic') || ageDisplay.includes('early')) return 'theo';
    if (personality.includes('warm') || personality.includes('friendly') || personality.includes('confident')) return 'marcus';
    if (personality.includes('authoritative') || personality.includes('deep') || personality.includes('formal')) return 'james';
    if (personality.includes('gentle') || personality.includes('kind') || personality.includes('teacher')) return 'oliver';
    return 'marcus'; // Default male
  }

  // Default
  return 'aria';
}
```

---

## 9. index.ts — Barrel Export

```typescript
// packages/ai-core/src/prompts/index.ts

export { buildSystemPrompt } from './system.prompt';
export type { SystemPromptInput, CharacterPromptData, RelationshipData, EmotionState } from './system.prompt';

export { buildPersonalitySection, buildEmotionSection, REACTION_PHILOSOPHY } from './personality.prompt';
export { buildMessagingSection, getLengthProfile } from './messaging.prompt';
export { buildStoryPrompt, buildStoryPlannerPrompt } from './story.prompt';
export type { StoryPromptInput } from './story.prompt';

export {
  buildImagePrompt,
  buildSelfiePrompt,
  buildReferenceImagePrompt,
} from './image.prompt';
export type { ImagePromptInput } from './image.prompt';

export {
  buildMemoryExtractionPrompt,
  buildConversationSummaryPrompt,
  buildDeepMemoryExtractionPrompt,
} from './memory.prompt';

export {
  buildRelationshipSection,
  getFriendLabel,
  getRelationshipSummary,
} from './relationship.prompt';

export {
  buildVoiceInstruction,
  getVoiceProfile,
  getAvailableVoices,
  recommendVoice,
  VOICE_PROFILES,
} from './voice.prompt';
export type { VoiceProfile, TTSemotion } from './voice.prompt';

// Legacy re-exports (for backward compatibility with existing prompts.ts)
export {
  PLATFORM_SAFETY_ENVELOPE,
  buildCharacterSystemPrompt,
} from '../prompts';
```

---

## Migration Path

**Current state:** All prompt logic lives in two files:
- `packages/ai-core/src/prompts.ts` — Character prompt builders, safety envelope, reaction philosophy
- `apps/api/src/ai/context-builder.service.ts` — Inline `buildSystemPrompt()` with messaging rules, memory injection, relationship context

**Step 1:** Create `packages/ai-core/src/prompts/` directory with all 8 module files as defined above.

**Step 2:** Refactor `ContextBuilderService.buildSystemPrompt()` to delegate to `buildSystemPrompt()` from `@itchats/ai-core/prompts`.

**Step 3:** Remove duplicate prompt logic from `context-builder.service.ts`, keeping only the database queries and assembly orchestration.

**Step 4:** Remove the inline `buildSystemPrompt` from `context-builder.service.ts`.

**Step 5:** Update `packages/ai-core/src/prompts.ts` to re-export from `./prompts/index.ts` for backward compatibility.

**Step 6:** Update `StorySchedulerService` to use `buildStoryPrompt()`.

**Step 7:** Update `AiService.extractMemory()` to use `buildMemoryExtractionPrompt()`.

**Benefits:**
- Single source of truth for every prompt component
- Each file is small, focused, and testable
- Voice profiles and emotion mappings are centralized
- Adding a new prompt domain requires only a new file + re-export
- Prompt changes don't require touching NestJS service code
