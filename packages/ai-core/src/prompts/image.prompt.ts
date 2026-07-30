/**
 * Image generation prompts: build character-consistent image prompts
 * using the canonical identity DNA.
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
