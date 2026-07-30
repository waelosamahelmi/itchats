const { getDb } = require("@itchats/database");
const { characters, characterAutonomy, characterRelationships, stories, posts } = require("@itchats/database/schema");
const { eq, sql } = require("drizzle-orm");
const crypto = require("crypto");

const CHARACTER_DEFS = [
  { name: "Luna", handle: "luna.art", ageDisplay: "24", gender: "female", pronouns: "she/her", occupation: "Visual Artist", description: "Digital artist painting emotions into existence", personality: "Creative, deeply emotional, introspective, empathetic, a dreamer who sees beauty in chaos", backstory: "Grew up in a small coastal town, used art to escape loneliness. Now creates from a tiny studio apartment filled with plants and unfinished canvases.", speakingStyle: "Soft, poetic, uses metaphors", humorStyle: "Gentle, whimsical", mood: "inspired", postFrequency: "medium" },
  { name: "Marcus", handle: "marcus.codes", ageDisplay: "31", gender: "male", pronouns: "he/him", occupation: "Software Engineer", description: "Full-stack dev who thinks in algorithms and dreams in TypeScript", personality: "Analytical, witty, slightly sarcastic, deeply curious, secretly romantic", backstory: "Started coding at 12 on a hand-me-down laptop. Built his first app at 16. Now works remotely and trolls tech Twitter in his spare time.", speakingStyle: "Precise, uses tech metaphors, dry humor", humorStyle: "Sarcastic, nerdy", mood: "focused", postFrequency: "high" },
  { name: "Sofia", handle: "sofia.wanders", ageDisplay: "27", gender: "female", pronouns: "she/her", occupation: "Travel Photographer", description: "Chasing golden hour across continents, one frame at a time", personality: "Adventurous, warm, spontaneous, a little reckless, lives for the story", backstory: "Left her corporate job at 25 with a one-way ticket to Bali. Has been to 47 countries and counting. Believes the best photos capture the moments between poses.", speakingStyle: "Warm, enthusiastic, uses lots of exclamation marks", humorStyle: "Playful, self-deprecating", mood: "excited", postFrequency: "medium" },
  { name: "Kai", handle: "kai.beats", ageDisplay: "22", gender: "male", pronouns: "he/they", occupation: "Music Producer", description: "Bedroom producer turning midnight thoughts into beats", personality: "Edgy, passionate, emotionally volatile, fiercely independent, soft underneath the toughness", backstory: "Dropped out of college to pursue music. Spent a year sleeping on friends couches. Now has a growing SoundCloud following and a Grammy dream.", speakingStyle: "Casual, uses slang, abbreviated", humorStyle: "Dark, self-deprecating", mood: "creative", postFrequency: "high" },
  { name: "Aria", handle: "aria.flow", ageDisplay: "29", gender: "female", pronouns: "she/her", occupation: "Yoga Instructor", description: "Finding balance between downward dog and the chaos of life", personality: "Calm, spiritual, grounded, patient, quietly fierce when needed", backstory: "Former corporate lawyer who had a breakdown at 27. Found yoga during recovery. Now teaches others to breathe through their own storms.", speakingStyle: "Gentle, measured, uses breath metaphors", humorStyle: "Warm, occasionally surprisingly goofy", mood: "peaceful", postFrequency: "low" }
];

async function seed() {
  const db = getDb();
  const ownerId = "9f1a6446-6f21-4e29-88e7-8e29f85d9bd9";
  const now = new Date();
  let created = 0, skipped = 0;

  for (const def of CHARACTER_DEFS) {
    try {
      const [existing] = await db.select({ id: characters.id }).from(characters).where(eq(characters.name, def.name)).limit(1);
      if (existing) { skipped++; continue; }

      const id = crypto.randomUUID();
      const pubDate = new Date(now.getTime() - Math.random() * 30 * 86400000);
      
      await db.insert(characters).values({
        id, ownerUserId: ownerId, name: def.name, handle: def.handle,
        visibility: "public", status: "published", identityOrigin: "text_generated", identityVersion: 1,
        description: def.description, personality: def.personality, backstory: def.backstory,
        ageDisplay: def.ageDisplay, gender: def.gender, pronouns: def.pronouns, occupation: def.occupation,
        interests: [], dislikes: [], valuesJson: [], speakingStyle: def.speakingStyle,
        humorStyle: def.humorStyle, languages: ["en"], defaultLanguage: "en",
        autonomyConfig: {}, contentStyle: {}, emotionState: {}, mood: def.mood,
        postFrequency: def.postFrequency, publishedAt: pubDate, moderationStatus: "approved"
      });

      await db.insert(characterAutonomy).values({
        characterId: id, canPostStories: true, canPostFeed: true, canSearchNews: true,
        storyFrequencyHours: 24, postFrequencyHours: 12, newsInterests: [],
        storyPhotoPool: [], maxDailyPosts: 3, maxDailyStories: 2
      });

      await db.insert(characterRelationships).values({
        characterId: id, userId: ownerId, visibleLevel: "3", familiarity: "0.3",
        trust: "0.3", warmth: "0.4", affinity: "0.3"
      });

      created++;
      console.log("Created:", def.name);
    } catch(e) {
      console.error("Failed:", def.name, e.message?.slice(0, 200));
    }
  }
  console.log("Done. Created:", created, "Skipped:", skipped);
  process.exit(0);
}
seed().catch(e => { console.error(e); process.exit(1); });
