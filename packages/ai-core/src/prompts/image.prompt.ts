/**
 * Image generation prompts: build character-consistent image prompts
 * using the canonical identity DNA.
 *
 * Enhanced with conversation-aware enrichment, relationship-level
 * adaptation, and context-driven selfie scene selection.
 */

export interface ImagePromptParams {
  characterName: string;
  gender?: string;
  ageDisplay?: string;
  description?: string;
  personality?: string;
  occupation?: string;
  canonicalPrompt?: string;
  photographyStyle?: string;
  cameraStyle?: string;
  selfieStyle?: string;
  // Identity DNA fields
  skinTone?: string;
  eyeColor?: string;
  hair?: string;
  bodyType?: string;
  height?: string;
  facialFeatures?: string;
  wardrobe?: string;
}

export interface EnrichedImageParams extends ImagePromptParams {
  /** The raw description from the LLM's [IMAGE: ...] marker */
  rawDescription: string;
  /** Relationship level 0-10 for intimacy adaptation */
  relationshipLevel?: number;
  /** Character's emotional state */
  currentMood?: string;
  /** Time of day for lighting adaptation */
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  /** The location/context the character claims to be in */
  claimedLocation?: string;
}

/**
 * Build a general-purpose character image prompt for any use.
 */
export function buildImagePrompt(params: ImagePromptParams, context?: string): string {
  const {
    characterName, gender, ageDisplay, description, occupation,
    photographyStyle,
  } = params;

  const parts: string[] = [];

  // If we have a canonical prompt, use it as the foundation
  if (params.canonicalPrompt) {
    parts.push(params.canonicalPrompt);
    if (context) parts.push(context);
    return parts.join('. ');
  }

  // Otherwise build from attributes
  const genderLabel = gender || 'person';
  const ageLabel = ageDisplay || 'young adult';

  parts.push(`A photorealistic portrait photo of ${characterName}, a ${genderLabel} in their ${ageLabel}`);

  if (description) parts.push(description.substring(0, 200));
  if (occupation) parts.push(`wearing attire suitable for a ${occupation}`);
  if (context) parts.push(context);

  const extras = [
    photographyStyle || 'professional headshot, cinematic lighting, shallow depth of field',
    'sharp focus on face, neutral warm-toned background, 8K quality, ultra-detailed skin texture',
    'photorealistic, one person only, consistent identity',
  ];
  parts.push(extras.join(', '));

  return parts.filter(Boolean).join('. ');
}

/**
 * Build an ENRICHED image prompt from the AI's raw description,
 * blending it with character DNA, relationship context, and mood.
 *
 * This is the key function for conversation images — it takes the
 * LLM's [IMAGE: description] and makes it generation-ready by
 * adding identity consistency guardrails, lighting cues from time
 * of day, relationship-appropriate framing, and character context.
 */
export function buildEnrichedImagePrompt(params: EnrichedImageParams): string {
  const {
    rawDescription, relationshipLevel, currentMood, timeOfDay,
    canonicalPrompt, characterName, gender, ageDisplay, description,
    photographyStyle, selfieStyle, wardrobe,
    skinTone, eyeColor, hair, bodyType, facialFeatures,
  } = params;

  const parts: string[] = [];

  // ── 1. FOUNDATION: identity anchors ──

  if (canonicalPrompt) {
    parts.push(canonicalPrompt);
  } else {
    const genderLabel = gender || 'person';
    const ageLabel = ageDisplay || 'young adult';
    parts.push(`A photorealistic photo of ${characterName}, a ${ageLabel} ${genderLabel}`);
    if (description) parts.push(description.substring(0, 200));
  }

  // Add identity consistency markers
  if (skinTone) parts.push(`${skinTone} skin tone`);
  if (eyeColor) parts.push(`${eyeColor} eyes`);
  if (hair) parts.push(`${hair} hair`);
  if (bodyType) parts.push(`${bodyType}`);
  if (facialFeatures) parts.push(facialFeatures);

  // ── 2. CORE: the AI's rich description ──

  parts.push(rawDescription);

  // ── 3. CHARACTER STYLE: photography & selfie preferences ──

  if (photographyStyle) parts.push(photographyStyle);
  if (selfieStyle) parts.push(selfieStyle);
  if (wardrobe) parts.push(`wearing ${wardrobe}`);

  // ── 4. RELATIONSHIP-ADAPTIVE FRAMING ──

  const relLevel = relationshipLevel ?? 1;
  if (relLevel >= 8) {
    parts.push('intimate personal photo, comfortable and natural, no awkward posing');
    parts.push('authentic connection evident, relaxed body language, feels like a photo sent to a partner');
  } else if (relLevel >= 5) {
    parts.push('warm and friendly photo, natural expression, comfortable in front of the camera');
  }

  // ── 5. MOOD INFLUENCE ──

  if (currentMood) {
    const moodTones: Record<string, string> = {
      happy: 'genuine warm smile, eyes crinkling with joy, bright and radiating positive energy',
      sad: 'subtle melancholic expression, soft and vulnerable, emotional depth in the eyes',
      excited: 'animated expression, big smile, energetic body language, eyes wide with excitement',
      playful: 'mischievous glint in the eyes, playful smirk or grin, fun and cheeky energy',
      horny: 'sultry gaze, slightly parted lips, intense eye contact, confident and alluring body language, sensual atmosphere',
      tired: 'sleepy eyes, relaxed features, soft and unguarded, cozy lethargic energy',
      calm: 'serene expression, soft eyes, peaceful and centered, gentle smile',
      confident: 'direct eye contact, strong posture, knowing slight smile, self-assured presence',
    };
    if (moodTones[currentMood]) parts.push(moodTones[currentMood]);
  }

  // ── 6. TIME-OF-DAY LIGHTING ──

  if (timeOfDay) {
    const timeLighting: Record<string, string> = {
      morning: 'soft diffused morning light, slightly cool color temperature, gentle window light, morning atmosphere',
      afternoon: 'bright natural daylight, warm neutral tones, clear and crisp lighting, midday energy',
      evening: 'warm golden hour or amber interior lighting, cozy atmosphere, long soft shadows, evening glow',
      night: 'dim intimate lighting, warm artificial light from lamps or fairy lights, atmospheric shadows, nighttime intimacy',
    };
    if (timeLighting[timeOfDay]) parts.push(timeLighting[timeOfDay]);
  }

  // ── 7. QUALITY & CONSISTENCY GUARDRAILS ──

  parts.push(
    'photorealistic, one real person only',
    'use the supplied reference image as the identity source; preserve the exact same face, facial geometry, hair, skin tone, and apparent age across all images',
    'natural skin texture with visible pores and slight imperfections',
    'no beauty-filter plastic skin, no text, no watermark, no AI smoothness',
    'anatomically correct, professional photography quality',
  );

  return parts.filter(Boolean).join('. ');
}

/**
 * Build a selfie-specific prompt.
 */
export function buildSelfiePrompt(params: ImagePromptParams, context?: string): string {
  const { characterName, selfieStyle, wardrobe } = params;
  const genderLabel = params.gender || 'person';

  const scenePresets: Record<string, string> = {
    casual_front_camera: 'a natural front-camera selfie at arm\'s length, direct eye contact with slight smile, relaxed imperfect framing, smartphone held visibly, natural room lighting from a window, slightly grainy phone camera quality',
    mirror_selfie: 'a realistic mirror selfie, phone visible covering part of face, reflected in a full-length mirror, natural reversed composition, bedroom or bathroom mirror with realistic background clutter, casual outfit, messy hair okay',
    activity_snapshot: 'a spontaneous front-camera snapshot during their current activity, candid mid-action expression, believable surroundings matching their lifestyle, slightly blurred movement, natural daylight or indoor practical lighting',
    dressed_up: 'a dressed-up front-camera portrait before going out, flattering warm practical lighting from a vanity mirror or window, authentic phone-camera framing, slight downward angle, confident expression',
    candid_low_light: 'a casual low-light phone selfie, mild sensor grain and noise, ambient practical lights from street lamps or dim room, natural skin texture, slight motion blur, authentic late-night vibe',
    golden_hour: 'a warm golden-hour front-camera selfie, soft directional sunlight at sunset, skin glowing naturally, slight lens flare, relaxed squinting expression, outdoor setting with warm amber tones',
    morning_bed: 'a messy morning selfie in bed, soft diffused morning light through curtains, bedhead hair, no makeup, sleepy expression, cozy bedroom atmosphere, slightly overexposed window light',
    cafe_moment: 'a candid selfie at a cozy coffee shop, warm interior lighting, coffee cup visible in frame or on table, natural window light, relaxed pose, slightly busy background with bokeh',
    romantic_evening: 'an intimate evening selfie, dim warm lighting from candles or string lights, soft romantic atmosphere, gentle expression, slightly tousled hair, cozy and inviting, bedroom or living room setting',
    beach_day: 'a bright beach selfie, harsh sunlight, sunglasses pushed up on head, wind in hair, squinting slightly from the sun, ocean in background, skin slightly sun-kissed, carefree summer energy',
    mirror_outfit: 'a full-length mirror selfie focused on the outfit, phone partially visible in hand, natural lighting from window or room, showing clothing from head to mid-thigh, casual or dressed up depending on situation',
    night_intimate: 'a very intimate late-night selfie, only fairy lights or dim bedside lamp for lighting, in bed or on couch, soft gaze, relaxed and vulnerable, quiet nighttime intimacy',
  };
  const scene = context && scenePresets[context] ? scenePresets[context] : context;

  return [
    `photorealistic smartphone selfie photo of ${params.canonicalPrompt || `${characterName}, a ${genderLabel}, ${params.description || ''}`}`,
    scene || scenePresets.casual_front_camera,
    selfieStyle || 'casual, natural lighting, looking at camera, modern smartphone selfie quality, slightly grainy',
    wardrobe ? `wearing ${wardrobe}` : '',
    'vertical 9:16 aspect ratio, social media story format, candid authentic feel, no studio lighting, real phone camera quality',
    'use the supplied reference image as the identity source; preserve the exact same face, facial geometry, hair, skin tone, and apparent age across all images',
    'one real person only, photorealistic, anatomically correct hands holding phone, natural skin texture with visible pores and slight imperfections, no beauty-filter plastic skin, no text, no watermark, no AI smoothness',
  ].filter(Boolean).join(', ');
}

/**
 * Build a selfie prompt enriched with scene description from the LLM's [SCENE: ...] marker.
 * Falls back to preset matching if the scene text matches a known preset keyword.
 */
export function buildSceneSelfiePrompt(params: ImagePromptParams, sceneDescription: string): string {
  // First, try to match preset scenes by keyword
  const sceneLower = sceneDescription.toLowerCase();
  const presetMap: Record<string, string> = {
    morning: 'morning_bed', bed: 'morning_bed', 'just woke': 'morning_bed', bedroom: 'morning_bed',
    mirror: 'mirror_outfit', outfit: 'mirror_outfit', 'full body': 'mirror_outfit',
    cafe: 'cafe_moment', coffee: 'cafe_moment', 'coffee shop': 'cafe_moment',
    'golden hour': 'golden_hour', sunset: 'golden_hour', park: 'golden_hour', outdoor: 'golden_hour',
    dressed: 'dressed_up', 'going out': 'dressed_up', 'before going': 'dressed_up',
    night: 'night_intimate', intimate: 'night_intimate', 'fairy lights': 'night_intimate', dim: 'night_intimate',
    beach: 'beach_day', ocean: 'beach_day', sea: 'beach_day',
  };

  for (const [keyword, preset] of Object.entries(presetMap)) {
    if (sceneLower.includes(keyword)) {
      return buildSelfiePrompt(params, preset);
    }
  }

  // No preset matched — use the scene description directly + identity anchors
  const { characterName, canonicalPrompt, description, selfieStyle, wardrobe } = params;
  const genderLabel = params.gender || 'person';

  return [
    `photorealistic smartphone selfie photo of ${canonicalPrompt || `${characterName}, a ${genderLabel}, ${description || ''}`}`,
    sceneDescription,
    selfieStyle || 'casual, natural lighting, modern smartphone selfie quality',
    wardrobe ? `wearing ${wardrobe}` : '',
    'vertical 9:16 aspect ratio, social media story format, candid authentic feel, no studio lighting, real phone camera quality',
    'use the supplied reference image as the identity source; preserve the exact same face, facial geometry, hair, skin tone, and apparent age across all images',
    'one real person only, photorealistic, anatomically correct hands holding phone, natural skin texture, no beauty-filter plastic skin, no text, no watermark',
  ].filter(Boolean).join(', ');
}

/**
 * Build a reference-pack image prompt for a specific type.
 */
export function buildReferenceImagePrompt(params: ImagePromptParams, type: string): string {
  const base = params.canonicalPrompt ||
    buildImagePrompt(params, `professional portrait, looking at camera`);

  const typeOverrides: Record<string, string> = {
    portrait: `${base}. Professional headshot, chest-up, looking at camera.`,
    portrait_smile: `${base}. Warm genuine smile, teeth showing slightly.`,
    portrait_side: `${base}. Profile view, 3/4 angle, sharp jawline.`,
    portrait_full: `${base}. Full body, standing naturally. ${params.wardrobe || ''}.`,
    selfie: `${params.characterName} taking a selfie, phone in frame, ${params.selfieStyle || 'casual natural'}.`,
    casual: `${base}. Relaxed casual setting, ${params.wardrobe || 'casual outfit'}.`,
    outdoor: `${base}. Outdoor setting, golden hour lighting.`,
    night: `${base}. Night time, warm artificial lighting.`,
    formal: `${base}. Dressed formally, elegant setting.`,
    closeup: `${base}. Extreme close-up face, macro detail.`,
  };

  const prompt = typeOverrides[type] || base;
  return `${prompt} photorealistic, consistent identity, same person, one person only, 8K quality`;
}
