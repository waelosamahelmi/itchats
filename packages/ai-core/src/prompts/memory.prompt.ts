/**
 * Memory-aware context prompt: injects recalled memories into the conversation.
 */

export interface MemoryPromptParams {
  memories: string[];
  recentExchange?: string;
}

export function buildMemoryPrompt(params: MemoryPromptParams): string {
  const { memories, recentExchange } = params;

  let prompt = '';

  if (memories.length > 0) {
    prompt += `\nMEMORIES OF THIS PERSON:\n${memories.map(m => `• ${m}`).join('\n')}\n`;
  }

  if (recentExchange) {
    prompt += `\nRECENT EXCHANGE (for conversation continuity): ${recentExchange}\n`;
  }

  return prompt;
}

/**
 * Memory extraction prompt — sent to a cheap model to evaluate if an exchange
 * contains something worth remembering.
 */
export function buildMemoryExtractionPrompt(userMessage: string, aiResponse: string): string {
  return `Analyze this conversation exchange and determine if the user revealed anything worth remembering about themselves.

USER: ${userMessage.slice(0, 400)}
AI: ${aiResponse.slice(0, 200)}

Return ONLY a JSON object (no markdown, no explanation):
{
  "hasMemory": true/false,
  "content": "What to remember (1 short sentence, max 120 chars)",
  "type": "identity_fact|preference|relationship_event|promise|recurring_topic|sensitive_fact|temporary_context",
  "importance": 0.0-1.0 (how important is this for future conversations?),
  "confidence": 0.0-1.0 (how certain are you this is accurate?)
}

Rules:
- identity_fact: name, age, location, job, family, background
- preference: likes, dislikes, favorites, opinions
- relationship_event: something meaningful between us
- promise: they committed to something
- recurring_topic: topic they bring up often
- sensitive_fact: potentially private/sensitive info — set importance LOW
- temporary_context: short-term context only, set importance LOW
- Only return hasMemory:true if there's genuinely something worth remembering. Small talk = false.`;
}
