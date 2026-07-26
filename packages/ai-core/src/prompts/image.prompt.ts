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

  return [
    `${characterName}, a ${genderLabel} taking a selfie`,
    context || '',
    selfieStyle || 'casual, natural lighting, looking at camera, modern smartphone selfie quality',
    wardrobe ? `wearing ${wardrobe}` : '',
    'selfie style, arm extended holding phone, 1 person only, photorealistic, consistent identity',
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
