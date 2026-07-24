import { z } from 'zod';

export const GenerationType = z.enum([
  'llm_chat', 'character_autofill', 'character_reference', 'text_to_image',
  'image_to_image', 'text_to_video', 'image_to_video', 'reference_to_video',
  'tts', 'asr', 'embedding', 'moderation', 'memory_extract', 'story_plan',
]);
export type GenerationType = z.infer<typeof GenerationType>;

export const GenerationStatus = z.enum(['queued', 'processing', 'succeeded', 'failed', 'cancelled']);
export type GenerationStatus = z.infer<typeof GenerationStatus>;

export const GenerationJobSchema = z.object({
  id: z.string().uuid(),
  generationType: GenerationType,
  status: GenerationStatus,
  routeKey: z.string(),
  createdAt: z.string(),
});
export type GenerationJob = z.infer<typeof GenerationJobSchema>;
