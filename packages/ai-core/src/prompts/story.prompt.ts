/**
 * Story generation prompts for autonomous character stories.
 */

export interface StoryPromptParams {
  characterName: string;
  personality: string;
  backstory: string;
  description: string;
  currentActivity: string;
  currentMood: string;
  currentLocation: string;
  energyLevel: number;
  photographyStyle?: string;
  selfieStyle?: string;
  cameraStyle?: string;
}

export function buildStoryPrompt(params: StoryPromptParams): string {
  const {
    characterName, personality, backstory, description,
    currentActivity, currentMood, currentLocation, energyLevel,
  } = params;

  return `You are ${characterName}. ${personality || ''} ${backstory ? `Backstory: ${backstory.substring(0, 300)}` : ''}

CURRENT STATUS:
- Activity: ${currentActivity}
- Location: ${currentLocation}
- Mood: ${currentMood}
- Energy: ${energyLevel}/10

Write a short social media story (2-3 sentences, max 200 chars) in first person as this character.
Make it authentic to their personality and current context.
Include 1-2 relevant emojis.
Be casual and natural — like an Instagram story.
Don't announce what you're doing — just share a moment or thought naturally.`;
}

export function buildStoryImagePrompt(params: StoryPromptParams, caption: string): string {
  const {
    characterName, description, currentActivity, currentLocation,
    photographyStyle, selfieStyle, cameraStyle,
  } = params;

  return [
    `Social media story image for ${characterName}`,
    description?.substring(0, 200) || caption,
    currentActivity ? `${currentActivity} at ${currentLocation}` : '',
    photographyStyle || 'cinematic, aesthetic',
    selfieStyle || '',
    cameraStyle || 'vertical 9:16 aspect ratio',
    'photorealistic, one person only, consistent identity, natural lighting',
  ].filter(Boolean).join('. ');
}
