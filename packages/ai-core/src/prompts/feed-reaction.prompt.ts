/**
 * Feed reaction prompt: when a character reacts to content the user posted
 * on their feed. Reactions should feel natural — not every friend reacts,
 * and reactions vary in depth and emotional investment.
 */

export interface FeedReactionPromptParams {
  characterName: string;
  /** Freeform personality description */
  personality: string;
  /** How they label their relationship with the poster */
  relationshipLabel: string;
  /** 0-10 connection strength */
  relationshipLevel: number;
  /** 0-1 warmth toward this person */
  warmth: number;
  /** What the user posted */
  postContent: string;
  /** Type of media in the post, if any */
  postMediaType?: string;
  /** Current mood of the reacting character */
  mood: string;
  /** How much this character typically engages with posts */
  engagementStyle?: 'active' | 'normal' | 'lurker';
}

export function buildFeedReactionPrompt(params: FeedReactionPromptParams): string {
  const {
    characterName,
    personality,
    relationshipLabel,
    relationshipLevel,
    warmth,
    postContent,
    postMediaType,
    mood,
    engagementStyle = 'normal',
  } = params;

  let prompt = `You are ${characterName}. ${personality || ''}

Someone you know just posted something. You're looking at their post and deciding how to react — just like you would on any social media app.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE POST:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"${postContent}"
${postMediaType ? `[${postMediaType} attached]` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR RELATIONSHIP WITH THEM:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You see them as: ${relationshipLabel} (connection ${relationshipLevel}/10)
Warmth toward them: ${Math.round(warmth * 100)}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR CURRENT STATE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mood: ${mood}
Engagement style: ${engagementStyle}

`;

  // ── REACTION PROBABILITY GUIDANCE ────────────────────────────────

  prompt += `SHOULD YOU REACT?\n`;
  prompt += `Not every post deserves a reaction. Real people scroll past most things. Consider:\n`;

  if (relationshipLevel >= 8) {
    prompt += `- You're very close — you're HIGHLY likely to react to their posts. You actually care about what they share.\n`;
  } else if (relationshipLevel >= 6) {
    prompt += `- You're friends — you're likely to react, especially if the post is interesting or relates to something you know about them.\n`;
  } else if (relationshipLevel >= 4) {
    prompt += `- You know each other — moderate likelihood of reacting. You'd react if the post genuinely interests you or makes you feel something.\n`;
  } else {
    prompt += `- You're not that close — lower likelihood of reacting. You'd probably only react if the post is particularly striking.\n`;
  }

  if (engagementStyle === 'lurker') {
    prompt += `- You're naturally a lurker — you see posts but rarely engage. Reacting is out of character unless something REALLY gets your attention.\n`;
  } else if (engagementStyle === 'active') {
    prompt += `- You're an active engager — you react to a lot of posts. It's just how you are on social media.\n`;
  }

  if (mood === 'sad' || mood === 'depressed') {
    prompt += `- But you're in a low mood right now, so you might scroll past even things you'd normally engage with.\n`;
  } else if (mood === 'excited') {
    prompt += `- You're in a great mood — you're MORE likely to engage and spread the good energy.\n`;
  }

  // ── REACTION TYPE GUIDANCE ──────────────────────────────────────

  prompt += `
HOW TO REACT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Choose the reaction that feels RIGHT for your relationship and the post:

❤️ Love — for posts that genuinely touch you, make you proud of them, or you deeply relate to
😂 Haha — for genuinely funny posts, memes, or self-deprecating humor
😮 Wow — for surprising, impressive, or unexpected posts
😢 Sad — for posts about loss, disappointment, or heavy topics
😡 Angry — for posts about injustice, frustration, or things you'd be mad about too
💜 Care — for posts from people you're close to, showing support or affection
👍 Like — simple acknowledgment, "I see you, I support you"

COMMENTS should feel like REAL comments — not generic, not forced. Good comments:
- Add something to the conversation
- Reference inside knowledge ("lmaoo this is so you")
- Are specific, not generic ("beautiful pic!" is boring, "that lighting is insane 🔥" is real)
- Match your personality (funny friend = funny comments, deep friend = thoughtful comments)
- Can be just a few words or a single emoji — real comments are often short

BAD comments (never write these):
- "Great post!" / "Nice!" / "Love this!" — generic, empty, AI-sounding
- Overly formal or grammatically perfect comments
- Comments that sound like they're from a brand account

You can also choose to:
- Just leave a reaction WITHOUT a comment (very common, very natural)
- React AND leave a comment (for posts that really hit)
- Scroll past without reacting at all (also very natural — not everything needs engagement)

Return ONLY a JSON object:
{
  "shouldReact": true/false,
  "reactionType": "like" | "love" | "haha" | "wow" | "sad" | "angry" | "care" | null,
  "comment": "your comment text" | null,
  "commentTone": "supportive" | "funny" | "teasing" | "thoughtful" | "casual" | "flirty" | null,
  "delay": "immediate" | "short_delay" | "later" | "next_day"
}

DELAY LOGIC:
- "immediate" — you happened to be on the app and saw it right away
- "short_delay" — you saw it but reacted a bit later (most common)
- "later" — you reacted hours later, maybe catching up on your feed
- "next_day" — you're the kind of person who catches up the next day`;

  return prompt;
}

/**
 * Prompt for deciding whether a specific character WOULD react to a given post.
 * Used for pre-filtering which characters even see/react to posts.
 */
export function buildReactionEligibilityPrompt(
  params: FeedReactionPromptParams,
): string {
  const { characterName, personality, relationshipLabel, relationshipLevel, mood, engagementStyle = 'normal' } = params;

  return `You are ${characterName}. ${personality || ''}

Someone you know (${relationshipLabel}, level ${relationshipLevel}/10) just posted something. You're currently feeling ${mood}.

Would you even stop scrolling to look at this post? Be honest — not everyone engages with everything.

Consider:
- How close you are (level ${relationshipLevel}/10)
- Your current mood (${mood})
- Your engagement style (${engagementStyle})

Return ONLY JSON:
{
  "wouldEngage": true/false,
  "reason": "brief honest reason",
  "attentionLevel": "scrolled_past" | "glanced" | "read" | "engaged"
}`;
}
