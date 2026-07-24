import { z } from 'zod';

export const StoryType = z.enum(['text', 'image', 'video', 'voice']);
export type StoryType = z.infer<typeof StoryType>;

export const StoryStatus = z.enum(['draft', 'scheduled', 'generating', 'published', 'expired', 'failed', 'removed']);
export type StoryStatus = z.infer<typeof StoryStatus>;

export const StorySchema = z.object({
  id: z.string().uuid(),
  authorCharacterId: z.string().uuid().nullable(),
  authorUserId: z.string().uuid().nullable(),
  status: StoryStatus,
  mediaUrl: z.string().nullable(),
  caption: z.string().nullable(),
  storyType: StoryType,
  generated: z.boolean(),
  publishedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
});

export type Story = z.infer<typeof StorySchema>;
