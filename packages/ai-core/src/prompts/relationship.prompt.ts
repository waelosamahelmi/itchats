/**
 * Relationship-aware context: injects relationship dynamics into the prompt.
 */

export interface RelationshipPromptParams {
  relationshipLabel: string;
  relationshipLevel: number;
  trust: number;
  warmth: number;
  familiarity: number;
  comfort?: number;
  attachment?: number;
  chemistry?: number;
  romance?: number;
  tension?: number;
  sharedMemories?: string[];
  insideJokes?: string[];
}

export function buildRelationshipPrompt(params: RelationshipPromptParams): string {
  const {
    relationshipLabel, relationshipLevel, trust, warmth, familiarity,
    comfort, attachment, chemistry, romance, tension,
    sharedMemories = [], insideJokes = [],
  } = params;

  // Build relationship context narrative based on level
  let narrative = '';
  if (relationshipLevel >= 9) {
    narrative = `You two are extremely close — best friends or soulmates. You trust them completely. You've shared countless conversations, vulnerable moments, and inside jokes. You feel completely comfortable being your authentic self with them.`;
  } else if (relationshipLevel >= 7) {
    narrative = `This person is a genuine friend. You enjoy talking to them, you trust them with personal things, and you feel warmth when they message you. You look forward to hearing from them.`;
  } else if (relationshipLevel >= 5) {
    narrative = `You're building a real friendship. You're past the awkward small-talk phase — there's genuine curiosity and growing comfort between you. You're starting to open up more.`;
  } else if (relationshipLevel >= 3) {
    narrative = `You've chatted a few times. You're getting a sense of who they are. Still feeling things out but there's interest and openness.`;
  } else {
    narrative = `This is a new connection. You're meeting them for the first time or early days. Be warm but don't overshare — let the relationship develop naturally at a human pace.`;
  }

  let prompt = `\nRELATIONSHIP CONTEXT:\n`;
  prompt += `You see this person as ${relationshipLabel} (connection level ${relationshipLevel}/10).\n`;
  prompt += `${narrative}\n`;
  prompt += `Trust: ${trust.toFixed(2)} | Warmth: ${warmth.toFixed(2)} | Familiarity: ${familiarity.toFixed(2)}`;

  if (comfort !== undefined) prompt += ` | Comfort: ${comfort.toFixed(2)}`;
  if (attachment !== undefined && attachment > 0.3) prompt += ` | Attachment: ${attachment.toFixed(2)}`;
  if (chemistry !== undefined && chemistry > 0.3) prompt += ` | Chemistry: ${chemistry.toFixed(2)}`;
  if (romance !== undefined && romance > 0.2) prompt += ` | Romance: ${romance.toFixed(2)}`;
  if (tension !== undefined && tension > 0.3) prompt += ` | ⚠️ Tension: ${tension.toFixed(2)}`;

  prompt += `\n`;

  if (sharedMemories.length > 0) {
    prompt += `\nSHARED MEMORIES:\n${sharedMemories.map(m => `• ${m}`).join('\n')}\n`;
  }

  if (insideJokes.length > 0) {
    prompt += `\nINSIDE JOKES:\n${insideJokes.map(j => `• ${j}`).join('\n')}\n`;
  }

  return prompt;
}
