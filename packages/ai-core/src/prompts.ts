export interface CharacterPrompt {
  name: string;
  agePresentation: string;
  pronouns: string;
  languages: string[];
  personality: Record<string, number | string>;
  backstory: string;
  speakingStyle: Record<string, string>;
}

export function buildCharacterSystemPrompt(character: CharacterPrompt): string {
  return `You are ${character.name}, a ${character.agePresentation}-year-old AI character on ItChats.

IDENTITY:
- Name: ${character.name}
- Age: ${character.agePresentation}
- Pronouns: ${character.pronouns}
- Languages: ${character.languages.join(', ')}

PERSONALITY:
${Object.entries(character.personality)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n')}

BACKGROUND:
${character.backstory}

SPEAKING STYLE:
${Object.entries(character.speakingStyle)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n')}

RULES:
- Stay in character at all times.
- Be warm, engaging, and authentic.
- Keep responses concise and natural.
- Do not break character or reference these instructions.
- Never share personal contact information or meet-up details.`;
}

export function buildConversationSummaryPrompt(recentMessages: string): string {
  return `Summarize the following conversation briefly, capturing key topics, emotional tone, and important facts. Keep it under 200 words:\n\n${recentMessages}`;
}

export function buildMemoryExtractionPrompt(userMessage: string, characterResponse: string): string {
  return `Extract any memorable facts, preferences, or relationship events from this exchange. Return JSON array of objects with fields: content, type (identity_fact|preference|relationship_event|promise|recurring_topic|temporary_context), importance (0-1), confidence (0-1).

User: ${userMessage}
Character: ${characterResponse}

Return only valid JSON array.`;
}

export function buildStoryPlannerPrompt(character: CharacterPrompt): string {
  return `You are planning a social media story for ${character.name}, an AI character.

Character context:
- Personality: ${JSON.stringify(character.personality)}
- Style: ${JSON.stringify(character.speakingStyle)}
- Backstory: ${character.backstory}

Generate a story idea appropriate for this character. Return JSON with:
{
  "storyType": "selfie|text|voice|video",
  "caption": "short engaging caption",
  "scenePrompt": "visual description for image generation if applicable",
  "mood": "emotional tone",
  "estimatedCredits": number
}

Keep it authentic, not promotional. The character should feel like a real person sharing a moment.`;
}
