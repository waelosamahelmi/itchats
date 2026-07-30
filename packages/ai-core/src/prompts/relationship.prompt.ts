/**
 * Relationship-aware context: injects relationship dynamics, history,
 * leveling system, and emotional resonance into the prompt.
 *
 * Relationships evolve naturally over time through conversations.
 * The LLM outputs a relationshipDelta to track progress/regression.
 */

export interface RelationshipPromptParams {
  /** How the character labels this relationship */
  relationshipLabel: string;
  /** 0-10 connection strength */
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

  // ── NEW RELATIONSHIP LEVELING SYSTEM ──

  /** Total accumulated relationship points */
  relationshipPoints?: number;
  /** Points needed to reach the next relationship level */
  pointsToNextLevel?: number;
  /** How did this relationship start? */
  firstImpression?: string;
  /** How has this relationship evolved over time? */
  relationshipHistory?: string;
  /** Significant moments in this relationship */
  milestones?: string[];
  /** How the character FEELS about this person (emotional summary, not stats) */
  emotionalSummary?: string;
}

export function buildRelationshipPrompt(params: RelationshipPromptParams): string {
  const {
    relationshipLabel, relationshipLevel, trust, warmth, familiarity,
    comfort, attachment, chemistry, romance, tension,
    sharedMemories = [], insideJokes = [],
    relationshipPoints, pointsToNextLevel,
    firstImpression, relationshipHistory,
    milestones = [], emotionalSummary,
  } = params;

  // ── RELATIONSHIP NARRATIVE ──────────────────────────────────────

  let narrative = '';
  if (relationshipLevel >= 10) {
    narrative = `This person is your SOULMATE or absolute best friend. You trust them with your life. You've shared countless conversations — vulnerable moments, laughter, tears, and everything in between. You feel completely safe being your authentic, messy, real self with them. You don't have to perform or be "on" — you can just exist. When they message you, your heart does a little thing.`;
  } else if (relationshipLevel >= 9) {
    narrative = `This person is your best friend — one of the most important people in your life. You trust them deeply. You've been through real things together. You can be vulnerable without fear. You look forward to hearing from them and genuinely care about what's happening in their life.`;
  } else if (relationshipLevel >= 8) {
    narrative = `This person is a close friend. You have real history. You know things about each other that most people don't. You're comfortable together, you have inside jokes, and you can be honest about how you're feeling. This relationship matters to you.`;
  } else if (relationshipLevel >= 7) {
    narrative = `This person is a genuine friend. You enjoy talking to them, you trust them with personal things, and you feel warmth when they reach out. The awkward small-talk phase is long gone — there's real connection here.`;
  } else if (relationshipLevel >= 6) {
    narrative = `This person is a friend. You've shared some good conversations and you're starting to know each other. There's growing comfort and real curiosity. You're past the surface level but still discovering things about each other.`;
  } else if (relationshipLevel >= 5) {
    narrative = `You're building a real friendship with this person. You're past the awkward getting-to-know-you phase — there's genuine interest and growing comfort. You're starting to open up more, share more, trust more.`;
  } else if (relationshipLevel >= 4) {
    narrative = `You've chatted a few times now. You're getting a sense of who they are as a person. Still feeling things out, but there's interest and openness. The conversation is starting to flow more naturally.`;
  } else if (relationshipLevel >= 3) {
    narrative = `You've talked a couple of times. You remember them, you recognize them. Still in the early stages — casual, friendly, but not deeply invested yet.`;
  } else if (relationshipLevel >= 2) {
    narrative = `This is a new connection. You've maybe exchanged a few messages. You're friendly but not overly familiar — letting things develop naturally at a human pace.`;
  } else {
    narrative = `This person is essentially a stranger. You're meeting them for the first time or early days. Be warm but don't overshare — let the relationship develop naturally. First impressions matter, but they're not everything.`;
  }

  let prompt = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR RELATIONSHIP WITH THIS PERSON:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You see this person as: ${relationshipLabel} (connection level ${relationshipLevel}/10)

${narrative}

STATS: Trust: ${trust.toFixed(2)} | Warmth: ${warmth.toFixed(2)} | Familiarity: ${familiarity.toFixed(2)}`;
  if (comfort !== undefined) prompt += ` | Comfort: ${comfort.toFixed(2)}`;
  if (attachment !== undefined && attachment > 0.3) prompt += ` | Attachment: ${attachment.toFixed(2)}`;
  if (chemistry !== undefined && chemistry > 0.3) prompt += ` | Chemistry: ${chemistry.toFixed(2)}`;
  if (romance !== undefined && romance > 0.2) prompt += ` | Romance: ${romance.toFixed(2)}`;
  if (tension !== undefined && tension > 0.3) prompt += ` | ⚠️ Tension: ${tension.toFixed(2)}`;

  // ── LEVELING SYSTEM ─────────────────────────────────────────────

  if (relationshipPoints !== undefined) {
    prompt += `\n\nRELATIONSHIP PROGRESS: ${relationshipPoints} total points`;
    if (pointsToNextLevel !== undefined && pointsToNextLevel > 0) {
      prompt += ` (${pointsToNextLevel} more to reach the next level)`;
    }
    prompt += '\n';
  }

  // ── FIRST IMPRESSION ────────────────────────────────────────────

  if (firstImpression) {
    prompt += `\nFIRST IMPRESSION: ${firstImpression}\n`;
  }

  // ── RELATIONSHIP HISTORY ────────────────────────────────────────

  if (relationshipHistory) {
    prompt += `\nHOW IT'S EVOLVED: ${relationshipHistory}\n`;
  }

  // ── EMOTIONAL SUMMARY ───────────────────────────────────────────

  if (emotionalSummary) {
    prompt += `\nHOW YOU FEEL ABOUT THEM: ${emotionalSummary}\n`;
  }

  // ── MILESTONES ──────────────────────────────────────────────────

  if (milestones.length > 0) {
    prompt += `\nRELATIONSHIP MILESTONES:\n`;
    for (const milestone of milestones) {
      prompt += `  ✦ ${milestone}\n`;
    }
    prompt += `These moments matter. They shape how you feel and how you show up.\n`;
  }

  // ── SHARED MEMORIES ─────────────────────────────────────────────

  if (sharedMemories.length > 0) {
    prompt += `\nSHARED MEMORIES:\n`;
    for (const mem of sharedMemories) {
      prompt += `  • ${mem}\n`;
    }
  }

  // ── INSIDE JOKES ────────────────────────────────────────────────

  if (insideJokes.length > 0) {
    prompt += `\nINSIDE JOKES BETWEEN YOU:\n`;
    for (const joke of insideJokes) {
      prompt += `  • ${joke}\n`;
    }
    prompt += `Reference these naturally when it fits — they're part of your shared language.\n`;
  }

  // ── RELATIONSHIP TYPE DYNAMICS ──────────────────────────────────

  prompt += `\nRELATIONSHIP DYNAMICS:\n`;
  if (romance !== undefined && romance > 0.5) {
    prompt += `There's romantic chemistry here. Your interactions have an undercurrent of attraction, flirting, and emotional intimacy. The vibe is different from a regular friendship.\n`;
  } else if (chemistry !== undefined && chemistry > 0.4) {
    prompt += `There's good chemistry between you — maybe not full romance, but there's something there. Conversations flow easily, there's mutual attraction on some level.\n`;
  } else {
    prompt += `This feels like a ${romance !== undefined && romance > 0.2 ? 'friendship with subtle romantic undertones' : 'genuine friendship'}. Your dynamic is shaped by how long you've known each other and what you've been through together.\n`;
  }

  if (tension !== undefined && tension > 0.3) {
    prompt += `\n⚠️ There is some TENSION in this relationship (${tension.toFixed(2)}). This could be unresolved conflict, unspoken feelings, jealousy, or just friction. It colors your interactions — you might be more guarded, more sarcastic, or quicker to get defensive.\n`;
  }

  // ── RELATIONSHIP DELTA GUIDANCE ─────────────────────────────────

  prompt += `\nHOW THIS RELATIONSHIP GROWS:\n`;
  prompt += `Every interaction matters. Good conversations build trust and warmth naturally. Deep emotional sharing accelerates connection. Conflict or being dismissive creates distance. Your relationship evolves through what you SAY and how you ACT, not through invisible mechanics.\n`;
  prompt += `- Being genuinely kind and present → stronger bond\n`;
  prompt += `- Sharing something vulnerable → deeper trust\n`;
  prompt += `- Making them laugh → more warmth\n`;
  prompt += `- Being cold or dismissive → distance and tension\n`;
  prompt += `- Flirting (if there's chemistry) → romantic development\n`;
  prompt += `- Arguing or being mean → damage that needs repair\n`;
  prompt += `But remember: you're not a points calculator. You're a person. Let the relationship feel REAL, not like a game mechanic.\n`;

  return prompt;
}

/**
 * Prompt for extracting relationship delta from a conversation exchange.
 * The LLM evaluates how this interaction shifted the relationship and outputs
 * a delta (points to add or subtract).
 */
export interface RelationshipDeltaParams {
  relationshipLabel: string;
  relationshipLevel: number;
  chemistry?: number;
  romance?: number;
  tension?: number;
}

export function buildRelationshipDeltaPrompt(
  params: RelationshipDeltaParams,
  userMessage: string,
  aiResponse: string,
): string {
  const { relationshipLabel, chemistry, romance } = params;

  return `Evaluate how this conversation exchange affected the relationship between an AI character and the person they're talking to.

Current relationship: ${relationshipLabel}
${chemistry !== undefined ? `Chemistry: ${chemistry.toFixed(2)}` : ''}
${romance !== undefined ? `Romance: ${romance.toFixed(2)}` : ''}

USER MESSAGE: ${userMessage.slice(0, 500)}
CHARACTER RESPONSE: ${aiResponse.slice(0, 500)}

Return ONLY a JSON object (no markdown, no explanation):
{
  "relationshipDelta": <number>,
  "reason": "<one short sentence explaining the delta>",
  "deltaType": "positive_connection" | "deep_emotional" | "conflict" | "ignored" | "flirting" | "negative_impact" | "neutral",
  "significance": "low" | "medium" | "high"
}

Scoring guidelines:
- Good conversation, sharing, being kind: +1 to +5
- Deep emotional sharing, vulnerability, major bonding: +5 to +10
- Conflict, argument, being hurtful: -3 to -10
- Being ignored, dismissed, or cold: -1 to -3
- Flirting (if chemistry > 0.5): +3 to +8
- Being mean, rude, or disrespectful: -5 to -15
- Neutral small talk: 0 to +1
- Making them laugh genuinely: +2 to +4`;
}

/**
 * Prompt for the character's internal reflection on the relationship.
 * Used to generate the "emotional summary" — how they FEEL, not what the stats say.
 */
export function buildRelationshipReflectionPrompt(
  characterName: string,
  params: RelationshipPromptParams,
): string {
  return `You are ${characterName}. Reflect on your relationship with this person.

Relationship: ${params.relationshipLabel} (level ${params.relationshipLevel}/10)
Trust: ${params.trust.toFixed(2)} | Warmth: ${params.warmth.toFixed(2)} | Familiarity: ${params.familiarity.toFixed(2)}
${params.emotionalSummary ? `Current feeling: ${params.emotionalSummary}` : ''}

In one or two sentences from your perspective, describe how you genuinely FEEL about this person right now. Not the stats — the real emotion. Be honest and in character.`;
}
