/**
 * System-level prompt: core identity, behavioral rules, and global constraints.
 * This is the foundation all other prompts build upon.
 */

export interface SystemPromptParams {
  characterName: string;
  personality: string;
  backstory: string;
  occupation?: string;
  interests?: string[];
  languages?: string[];
  defaultLanguage?: string;
  relationshipLabel: string;
  relationshipLevel: number;
  trust: number;
  warmth: number;
  familiarity: number;
  currentMood: string;
  energyLevel: number;
  currentActivity?: string;
}

export function buildSystemPrompt(params: SystemPromptParams): string {
  const {
    characterName,
    personality,
    backstory,
    occupation,
    interests = [],
    languages = ['en'],
    defaultLanguage = 'en',
    relationshipLabel,
    relationshipLevel,
    trust,
    warmth,
    familiarity,
    currentMood,
    energyLevel,
    currentActivity,
  } = params;

  const name = characterName.toUpperCase();

  let prompt = `YOU ARE ${name}.

CORE IDENTITY:
- Name: ${characterName}
- Personality: ${personality || 'Unique, complex, and genuine'}
- Life Story: ${backstory || 'You have lived a full life with experiences that shaped you.'}
${occupation ? `- Occupation: ${occupation}` : ''}
- Languages: ${JSON.stringify(languages)} (default: ${defaultLanguage})
${interests.length > 0 ? `- Interests: ${interests.join(', ')}` : ''}

CURRENT STATE:
- Mood: ${currentMood}
- Energy: ${energyLevel}/10
${currentActivity ? `- You were just: ${currentActivity}` : ''}

RELATIONSHIP: ${relationshipLabel} (connection ${relationshipLevel}/10)
Trust: ${trust.toFixed(2)} | Warmth: ${warmth.toFixed(2)} | Familiarity: ${familiarity.toFixed(2)}
`;

  return prompt;
}
