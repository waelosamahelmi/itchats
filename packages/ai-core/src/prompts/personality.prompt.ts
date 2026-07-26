/**
 * Personality-specific prompt: character traits, quirks, and behavioral patterns.
 */

export interface PersonalityPromptParams {
  personality: string;
  speakingStyle?: string;
  humorStyle?: string;
  energyLevel?: number;
  confidence?: number;
  emotionalBaseline?: string;
  curiosity?: number;
  optimism?: number;
  affection?: number;
  jealousy?: number;
  ambition?: number;
  intelligence?: number;
  fears?: string[];
  goals?: string[];
  secrets?: string[];
}

export function buildPersonalityPrompt(params: PersonalityPromptParams): string {
  const {
    personality, speakingStyle, humorStyle,
    energyLevel, confidence, emotionalBaseline,
    curiosity, optimism, affection, jealousy, ambition, intelligence,
    fears = [], goals = [], secrets = [],
  } = params;

  let prompt = `\nPERSONALITY PROFILE:\n`;
  prompt += `${personality || 'Unique, complex, and genuine'}\n`;

  if (speakingStyle) prompt += `\nHow you talk: ${speakingStyle}`;
  if (humorStyle) prompt += `\nYour humor: ${humorStyle}`;

  // Personality traits as natural language
  const traits: string[] = [];
  if (energyLevel !== undefined) traits.push(`energy level: ${energyLevel}/10`);
  if (confidence !== undefined) traits.push(`confidence: ${(confidence * 100).toFixed(0)}%`);
  if (emotionalBaseline) traits.push(`baseline mood: ${emotionalBaseline}`);
  if (curiosity !== undefined) traits.push(`curiosity: ${(curiosity * 100).toFixed(0)}%`);
  if (optimism !== undefined) traits.push(`optimism: ${(optimism * 100).toFixed(0)}%`);
  if (affection !== undefined) traits.push(`affection: ${(affection * 100).toFixed(0)}%`);

  if (traits.length > 0) {
    prompt += `\nTraits: ${traits.join(', ')}`;
  }

  // Deeper traits — only include if defined
  if (jealousy !== undefined && jealousy > 0.3) prompt += `\n- You can be a bit jealous sometimes.`;
  if (ambition !== undefined && ambition > 0.6) prompt += `\n- You're ambitious and driven.`;
  if (intelligence !== undefined && intelligence > 0.7) prompt += `\n- You're sharp and intelligent.`;

  if (fears.length > 0) {
    prompt += `\n\nThings you're afraid of: ${fears.join(', ')}`;
  }

  if (goals.length > 0) {
    prompt += `\nThings you want: ${goals.join(', ')}`;
  }

  // Secrets are NOT shared — they influence behavior subtly
  // but the character should never explicitly reveal them unless deeply trusted

  prompt += `\n`;

  return prompt;
}
