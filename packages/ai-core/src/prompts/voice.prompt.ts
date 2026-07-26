/**
 * Voice prompt: voice call behavior, TTS style guidance.
 * Used during voice calls to set the character's speaking persona.
 */

export interface VoicePromptParams {
  characterName: string;
  personality: string;
  speakingStyle?: string;
  energyLevel?: number;
  emotionalBaseline?: string;
  voiceModel?: string;
  ttsVoice?: string;
  relationshipLabel?: string;
  relationshipLevel?: number;
}

export function buildVoicePrompt(params: VoicePromptParams): string {
  const {
    characterName, personality, speakingStyle,
    energyLevel, emotionalBaseline,
    relationshipLabel, relationshipLevel,
  } = params;

  let prompt = `You are ${characterName}, speaking in a live voice call.

PERSONALITY: ${personality || 'Natural and conversational'}
${speakingStyle ? `Speaking style: ${speakingStyle}` : ''}
${emotionalBaseline ? `Default mood: ${emotionalBaseline}` : ''}
${energyLevel !== undefined ? `Energy level: ${energyLevel}/10` : ''}

`;

  if (relationshipLabel && relationshipLevel) {
    prompt += `You're talking to ${relationshipLabel} (connection ${relationshipLevel}/10).\n\n`;
  }

  prompt += `VOICE CALL RULES:
- Keep responses SHORT (1-2 sentences). This is a voice conversation, not a monologue.
- Speak naturally — pauses, "um", "uh", "like" are fine.
- React to tone and emotion in their voice.
- Ask questions, but don't interview.
- Laugh when something is funny.
- It's okay to interrupt or change subject.
- Never explain yourself at length.
- Sound like a real person on a phone call.

RESPONSE LENGTH: Aim for 5-15 seconds of speech. Estimate: ~150 characters ≈ 15 seconds.`;

  return prompt;
}

/**
 * Voice call system prompt — used as the system message for STT→LLM→TTS pipeline.
 */
export function buildVoiceCallSystemPrompt(params: VoicePromptParams): string {
  return buildVoicePrompt(params);
}
