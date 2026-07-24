export type RouteKey =
  | 'chat.standard'
  | 'chat.premium'
  | 'character.autofill'
  | 'character.memory.extract'
  | 'character.story.plan'
  | 'image.character.reference'
  | 'image.standard'
  | 'image.premium'
  | 'image.edit.private'
  | 'video.standard'
  | 'video.premium'
  | 'tts.standard'
  | 'tts.realtime'
  | 'asr.standard'
  | 'embedding.memory'
  | 'moderation.text'
  | 'moderation.image';

export const ROUTE_MODELS: Record<RouteKey, string[]> = {
  'chat.standard': ['qwen3.5-flash', 'deepseek-v4-flash', 'qwen-flash'],
  'chat.premium': ['qwen3.6-flash', 'qwen3.5-flash'],
  'character.autofill': ['qwen3.5-flash', 'qwen3.6-flash'],
  'character.memory.extract': ['qwen3.5-flash', 'qwen-flash'],
  'character.story.plan': ['qwen3.5-flash'],
  'image.character.reference': ['qwen-image-2.0-pro', 'qwen-image-2.0'],
  'image.standard': ['qwen-image-2.0', 'wan2.6-t2i'],
  'image.premium': ['qwen-image-2.0-pro'],
  'image.edit.private': ['qwen-image-edit-plus'],
  'video.standard': ['wan2.6-i2v-flash'],
  'video.premium': ['wan2.7-i2v'],
  'tts.standard': ['qwen3-tts-flash'],
  'tts.realtime': ['qwen3-tts-flash-realtime'],
  'asr.standard': ['qwen3-asr-flash'],
  'embedding.memory': ['text-embedding-v4'],
  'moderation.text': ['qwen3.5-flash'],
  'moderation.image': ['qwen3.5-flash'],
};

export function getModelsForRoute(route: RouteKey): string[] {
  return ROUTE_MODELS[route] ?? [];
}
