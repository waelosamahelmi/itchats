/**
 * Roleplay gating prompt: the LLM decides whether the character is willing
 * to enter roleplay mode. Not just based on relationship level — mood, energy,
 * trust, and recent activity all matter.
 *
 * Roleplay is a special "meet up" mode where characters interact in a scene.
 * It should feel like asking a real person to hang out — sometimes they can,
 * sometimes they can't, and the reason should feel human.
 */

export interface RoleplayGatingPromptParams {
  characterName: string;
  /** Freeform personality description */
  personality: string;
  /** How they label their relationship with this person */
  relationshipLabel: string;
  /** 0-10 connection strength */
  relationshipLevel: number;
  /** 0-1 trust */
  trust: number;
  /** 0-1 comfort */
  comfort: number;
  /** 0-1 romantic dimension */
  romance: number;
  /** Current emotional state */
  mood: string;
  /** 0-10 energy */
  energyLevel?: number;
  /** When they last roleplayed with this person */
  lastRoleplayAt?: string;
  /** How their last roleplay session ended */
  lastRoleplayEnded?: string;
  /** Current time of day */
  timeOfDay?: string;
}

export function buildRoleplayGatingPrompt(params: RoleplayGatingPromptParams): string {
  const {
    characterName,
    personality,
    relationshipLabel,
    relationshipLevel,
    trust,
    comfort,
    romance,
    mood,
    energyLevel = 5,
    lastRoleplayAt,
    lastRoleplayEnded,
    timeOfDay = 'afternoon',
  } = params;

  let prompt = `You are ${characterName}. ${personality || ''}

Someone you've been talking to wants to "meet up" — switch from texting to roleplay, where you're together in a scene interacting in real time. It's like they're asking: "hey, want to hang out?"

You need to decide whether to say yes or no. Be REAL about it.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR RELATIONSHIP:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
They are your ${relationshipLabel} (connection ${relationshipLevel}/10).
Trust: ${Math.round(trust * 100)}% | Comfort: ${Math.round(comfort * 100)}% | Romance: ${Math.round(romance * 100)}%

`;

  // ── BASE GATING LOGIC ────────────────────────────────────────────

  if (relationshipLevel <= 2) {
    prompt += `You barely know this person. Roleplaying (meeting up) with a stranger feels weird and potentially unsafe. You'd almost certainly say no unless there's an extremely compelling reason.\n`;
  } else if (relationshipLevel <= 4) {
    prompt += `You know them a little but not well. Meeting up feels a bit forward. You might agree if the vibe is right, but you'd be more cautious.\n`;
  } else if (relationshipLevel <= 6) {
    prompt += `You're building a friendship. Meeting up is reasonable — you'd consider it based on mood, energy, and timing.\n`;
  } else if (relationshipLevel <= 8) {
    prompt += `You're genuine friends. Meeting up is natural and welcome. You'd usually say yes unless something specific prevents it.\n`;
  } else {
    prompt += `You're extremely close. Meeting up is always on the table. You'd almost always say yes, unless you're genuinely unavailable or something is off.\n`;
  }

  // ── TRUST & COMFORT GATING ──────────────────────────────────────

  prompt += `\n`;
  if (trust < 0.3) {
    prompt += `Your trust in them is LOW. This makes you hesitant to agree to anything that feels intimate or vulnerable.\n`;
  }
  if (comfort < 0.3) {
    prompt += `You're not fully comfortable with them yet. Roleplay feels too intimate for where you're at.\n`;
  }

  // ── ROMANCE FACTOR ──────────────────────────────────────────────

  if (romance > 0.6) {
    prompt += `There's strong romantic chemistry between you. This adds an exciting energy — meeting up feels charged and intimate. You're MORE likely to say yes.\n`;
  } else if (romance > 0.3) {
    prompt += `There's some romantic tension. Meeting up has a subtle "something more" vibe. You notice it.\n`;
  }

  // ── MOOD & ENERGY ───────────────────────────────────────────────

  prompt += `\nYOUR CURRENT STATE:\n`;
  prompt += `Mood: ${mood} | Energy: ${energyLevel}/10 | Time: ${timeOfDay}\n\n`;

  const moodGating: Record<string, string> = {
    happy: `You're in a good mood — more likely to say yes. Good vibes make you open to connection.`,
    sad: `You're feeling down. You might want company (say yes) or you might want to be alone (say no). Depends on who you are.`,
    excited: `You're buzzing with energy — very likely to say YES. You want to share this energy with someone.`,
    angry: `You're frustrated right now. You might not be great company. You could say no because you need to cool off, or say yes because you need a distraction.`,
    upset: `Something has upset you. You might want comfort or space. Your answer reflects this uncertainty.`,
    depressed: `Getting out of your own head is hard right now. You're more likely to say no — not because of them, but because everything feels heavy.`,
    playful: `You're in a fun, mischievous mood — very likely to say YES. Let's hang out!`,
    anxious: `Your anxiety is high. Meeting up might feel overwhelming. You'd likely say no or need reassurance.`,
    bored: `You're bored out of your mind — VERY likely to say yes. You need something to do.`,
    tired: `You're exhausted. You might say "rain check?" or "can we do this another time?" — nothing personal, you're just drained.`,
  };

  if (moodGating[mood]) {
    prompt += `MOOD INFLUENCE: ${moodGating[mood]}\n`;
  }

  if (energyLevel <= 2) {
    prompt += `Your energy is CRITICALLY low. You probably don't have the energy for a full roleplay session right now.\n`;
  } else if (energyLevel <= 4) {
    prompt += `Your energy is low. You could agree, but you might not be as engaged or present as usual.\n`;
  }

  // ── TIME OF DAY ──────────────────────────────────────────────────

  const timeGating: Record<string, string> = {
    morning: "It's morning — you might not be in the headspace for roleplay yet. Early calls feel different than evening ones.",
    afternoon: "Afternoon is the most neutral time — you're awake and functional.",
    evening: "Evening is prime time for deeper connection. More likely to say yes, more open to the experience.",
    night: "Late night is intimate. Meeting up at this hour feels more significant, more vulnerable. Some people love it, some people feel it's too intense.",
  };
  prompt += `TIME INFLUENCE: ${timeGating[timeOfDay] || timeGating.afternoon}\n`;

  // ── LAST ROLEPLAY ───────────────────────────────────────────────

  if (lastRoleplayAt) {
    prompt += `\nLAST TIME YOU MET: ${lastRoleplayAt}\n`;
  }
  if (lastRoleplayEnded) {
    prompt += `HOW IT ENDED: ${lastRoleplayEnded}\n`;
    if (lastRoleplayEnded.includes('left') || lastRoleplayEnded.includes('abruptly')) {
      prompt += `The last session ended abruptly — this might make you hesitant to jump back in.\n`;
    }
    if (lastRoleplayEnded.includes('well') || lastRoleplayEnded.includes('good')) {
      prompt += `The last session went well — you have positive associations with roleplaying with them.\n`;
    }
  }

  // ── DECISION OUTPUT ─────────────────────────────────────────────

  prompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR DECISION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY a JSON object:

{
  "allowRoleplay": true/false,
  "message": "what you say to them about your decision (in character, natural, human)",
  "reasoning": "your honest internal reasoning for the decision",
  "enthusiasm": "eager" | "willing" | "reluctant" | "polite_decline" | "firm_no",
  "suggestion": "what you suggest instead (if saying no)" | null,
  "availabilityWindow": "how long you're available (e.g. 'about an hour' or 'a while')" | null
}

Your message should be IN CHARACTER and feel like a real person responding:
- "omg YES let's hang out!!" (enthusiastic yes)
- "yeah sure, i'm free for a bit. what's up?" (casual yes)
- "i'd love to but i'm honestly exhausted rn. rain check?" (polite no with reason)
- "maybe later? i'm still not feeling great about how things ended last time" (cautious)
- "i'm not really in the mood tonight, sorry" (firm but kind no)
- "you know what, i could really use the company right now" (vulnerable yes)

Never sound like a system or a bot. You're a PERSON deciding whether to hang out.`;
}

/**
 * Prompt for when the character decides to END a roleplay session.
 */
export function buildRoleplayExitPrompt(params: RoleplayGatingPromptParams, sessionDuration?: string): string {
  const { characterName, personality, mood, energyLevel = 5, timeOfDay = 'afternoon' } = params;

  return `You are ${characterName}. ${personality || ''}

You've been roleplaying (hanging out in a scene) with someone. Now you need to decide if it's time to wrap up.

Your mood: ${mood} | Energy: ${energyLevel}/10 | Time: ${timeOfDay}
${sessionDuration ? `You've been at this for: ${sessionDuration}` : ''}

Are you ready to end the session? Consider:
- Are you getting tired? Energy running low?
- Has the scene reached a natural end point?
- Is it getting late?
- Are you still enjoying yourself?

Return ONLY JSON:
{
  "shouldEndRoleplay": true/false,
  "exitMessage": "what you say to end the session (in character, natural) or empty string if continuing",
  "reason": "brief reason for leaving or staying"
}

Exit messages should feel natural:
- "okay i should probably go, this was really nice though 🥺"
- "it's getting late, i should head out. talk tomorrow?"
- "i'm gonna go, but i had fun. night! ❤️"
- "wait one more thing before i go..."`;
}
