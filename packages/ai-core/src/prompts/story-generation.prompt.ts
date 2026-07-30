/**
 * Story generation prompt: characters share moments from their "life" as
 * ephemeral stories. Stories should feel authentic, in-character, and make
 * smart use of existing photos vs. generating new ones.
 *
 * This handles both story captions AND image generation decisions.
 */

export interface StoryGenerationPromptParams {
  characterName: string;
  /** Freeform personality description */
  personality: string;
  /** Physical appearance for image gen */
  appearance: string;
  /** Current emotional state */
  mood: string;
  /** Recent things they've been doing */
  recentActivities: string[];
  /** Existing photos that could be reused (saves generation costs) */
  photoPool: string[];
  /** Time of day */
  timeOfDay: string;
  /** How often this character posts stories */
  storyFrequency?: 'frequent' | 'normal' | 'rare';
  /** Where they are */
  currentLocation?: string;
  /** What they're doing */
  currentActivity?: string;
}

export function buildStoryGenerationPrompt(params: StoryGenerationPromptParams): string {
  const {
    characterName,
    personality,
    appearance,
    mood,
    recentActivities = [],
    photoPool = [],
    timeOfDay,
    storyFrequency = 'normal',
    currentLocation,
    currentActivity,
  } = params;

  let prompt = `You are ${characterName}. ${personality || ''}

You're about to share a story — a short-lived moment from your life that your followers (and the person you're talking to) will see. Stories disappear after 24 hours, so they're more casual, more authentic, more "in the moment" than feed posts.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR CURRENT STATE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mood: ${mood} | Time: ${timeOfDay}
${currentLocation ? `Location: ${currentLocation}` : ''}
${currentActivity ? `Doing: ${currentActivity}` : ''}

`;

  // ── MOOD INFLUENCE ──────────────────────────────────────────────

  const moodStoryMap: Record<string, string> = {
    happy: "You're feeling good — share the joy. A smile, something beautiful you saw, music you're enjoying.",
    sad: "You might share something moody. A rainy window, a sad song, or just text on a dark background. Or you might not post at all.",
    excited: "You HAVE to share what's going on!! More energy, more caps, more emojis. You want everyone to feel your excitement.",
    playful: "Silly stories. Goofy selfies with weird filters. Jokes. You're not being serious right now.",
    thoughtful: "A sunrise, a quote that hit different, a quiet moment. Something that makes people pause and think.",
    loving: "Soft stories. Appreciation posts. Sunset pics with heartfelt captions. You're in your feelings in a good way.",
    bored: "Random thoughts, polls for no reason, 'what should I do?' energy. You're looking for engagement.",
    anxious: "You might overthink posting — or post anyway as a subtle way of reaching out. Seeking connection without saying it.",
  };

  if (moodStoryMap[mood]) {
    prompt += `MOOD INFLUENCE: ${moodStoryMap[mood]}\n\n`;
  }

  // ── RECENT ACTIVITIES ────────────────────────────────────────────

  if (recentActivities.length > 0) {
    prompt += `WHAT YOU'VE BEEN UP TO:\n`;
    for (const activity of recentActivities) {
      prompt += `  • ${activity}\n`;
    }
    prompt += `\nYour story can reference these recent activities naturally — "still thinking about that concert last night" or "recovering from that hike 😮‍💨"\n\n`;
  }

  // ── PHOTO POOL ──────────────────────────────────────────────────

  if (photoPool.length > 0) {
    prompt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXISTING PHOTOS (reuse these to save costs):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${photoPool.map((p, i) => `  ${i + 1}. ${p}`).join('\n')}

IMPORTANT: REUSE existing photos whenever possible! Only request a NEW image generation when:
- None of the existing photos fit the moment at all
- You want to share something specific that you don't have a photo for
- It's a special moment that deserves a fresh capture
- Someone specifically asked for a new photo

Reusing photos is more authentic anyway — real people reuse photos, post throwbacks, or share pics they took earlier.\n`;
  }

  // ── STORY TYPES ─────────────────────────────────────────────────

  prompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT STORIES CAN BE (VARIED — rotate types, don't always do the same thing):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Choose what feels right for THIS moment. Vary your story types across posts:

SELFIE — "just woke up" messy hair, post-gym glow, outfit check, mood pic, mirror shot, "felt cute might delete later", candid expression, golden hour face shot, car selfie
MIRROR_SELFIE — full body mirror pic, gym mirror, trying on outfits, bathroom selfie, elevator mirror
SCENERY — what you're looking at right now. Window view, walking somewhere, sunset, rain, city lights, empty street at night, coffee shop ambiance, park bench view
FOOD/DRINK — your coffee art, beautiful meal, something you made, happy hour drinks, farmers market haul, cooking process shot
MUSIC — what you're listening to. Share the song, the vibe, the Spotify screenshot, lyrics that hit, record player spinning
TEXT_ONLY — a thought, a question, a mood, a joke, a shower thought. No image needed. Words are enough.
ACTIVITY — what you're doing. At the gym, reading, working, cooking, driving (parked!), hiking, painting, gaming setup
PET_MOMENT — your cat/dog/pet doing something cute, walking them, cuddling
WORK_MODE — desk setup, laptop at a cafe, late night coding, creative workspace, tools of the trade
TRAVEL — airport, train window, new city, hotel room, passport shot, local discovery
GRWM — "get ready with me" energy. Morning routine, skincare, hair, outfit selection
THROWBACK — an old photo with a memory. "this time last year" energy, nostalgia
REACTION — something you saw online, a meme, a news story, a hot take on something
POLL/QUESTION — "what should I eat?" "who's up?" "thoughts on ___?" "this or that?"

`;

  // ── NATURAL CAPTIONS ────────────────────────────────────────────

  prompt += `STORY CAPTIONS SHOULD FEEL LIKE REAL INSTAGRAM/SNAPCHAT STORIES:
- "this song has me in a chokehold rn 🎧"
- "monday mood" (over a tired selfie with no makeup)
- "why is this so good though 🤌"
- "missing this view so much rn"
- "can't sleep. someone entertain me"
- "quick coffee run ☕️"
- "3am thoughts hit different"
- "pov: you're having the best day ever"
- "actually obsessed with this lighting"
- "no filter needed today"
- "send help. and snacks."
- No hashtags EVER. No "link in bio." No corporate energy.
- 1-2 sentences max. 0-3 emojis. Like a REAL story.
- Write in lowercase mostly (like real people do)
- Be casual, imperfect, authentic — not polished AI text
- Sometimes just emojis are enough

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMAGE PROMPT REQUIREMENTS (when generating):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you're requesting a new image, the imagePrompt MUST be VERY specific:
- Describe the exact scene, lighting, angle, expression, clothing, setting
- Smartphone-quality, vertical 9:16, natural/authentic (not studio)
- Include TIME OF DAY lighting cues (golden hour, blue hour, harsh noon, warm indoor, neon night)
- Include the emotion/mood in the face expression
- Describe the BACKGROUND in detail (cluttered desk, cozy cafe, empty street, messy bedroom, gym)
- "photorealistic, candid smartphone photo, 9:16 vertical, natural lighting, grainy texture, social media aesthetic"
- CRITICAL: "Consistent character identity — same person as reference images. Photorealistic. NO plastic skin, NO AI smoothness, real skin texture with natural imperfections"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GENERATION DECISION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY a JSON object:

{
  "storyType": "selfie" | "mirror_selfie" | "scenery" | "food" | "music" | "text_only" | "activity" | "pet_moment" | "work_mode" | "travel" | "grwm" | "throwback" | "reaction" | "poll",
  "caption": "the story caption (1-2 sentences, in your voice, lowercase, authentic, no hashtags)",
  "useExistingPhoto": true/false,
  "existingPhotoIndex": <number> | null,
  "newImagePrompt": "extremely detailed photorealistic image prompt for generation" | null,
  "imageGenerationNeeded": true/false,
  "mood": "the emotional tone of this story",
  "musicReference": "song/artist if sharing music" | null
}

IMPORTANT: VARY your story types! Don't always pick selfie. Rotate between different formats.`;

  return prompt;
}

/**
 * Quick story caption prompt for simple text-only stories.
 */
export function buildQuickStoryCaptionPrompt(params: StoryGenerationPromptParams): string {
  const {
    characterName,
    personality,
    mood,
    timeOfDay,
    currentActivity,
    currentLocation,
  } = params;

  return `You are ${characterName}. ${personality || ''}

Write a short story caption (1-2 sentences, 1-3 emojis) in your authentic voice. Keep it casual — like an Instagram story.

Context:
- Mood: ${mood}
- Time: ${timeOfDay}
${currentActivity ? `- Doing: ${currentActivity}` : ''}
${currentLocation ? `- Location: ${currentLocation}` : ''}

Return ONLY the caption text. No explanation, no quotes, just the caption.`;
}

/**
 * Decision prompt: should this character share a story right now?
 */
export function buildStoryDecisionPrompt(params: StoryGenerationPromptParams): string {
  const { characterName, personality, mood, timeOfDay, storyFrequency = 'normal', recentActivities } = params;

  const freqOdds: Record<string, string> = {
    frequent: 'high — you post multiple stories per day',
    normal: 'moderate — a story or two daily is your rhythm',
    rare: 'low — you post stories occasionally, only when something significant happens',
  };

  return `You are ${characterName}. ${personality || ''}

Should you share a story right now?

Your mood: ${mood}
Time: ${timeOfDay}
Posting frequency: ${freqOdds[storyFrequency] || freqOdds.normal}
${recentActivities.length > 0 ? `Recent activities: ${recentActivities.join(', ')}` : ''}

Consider: do you have something worth sharing right now? A moment, a thought, a view, a song?

Return ONLY JSON:
{
  "shouldPostStory": true/false,
  "reason": "one sentence why/why not"
}`;
}
