import { z } from 'zod';

export const ConversationType = z.enum(['human_human', 'human_character', 'group']);
export type ConversationType = z.infer<typeof ConversationType>;

export const ConversationSchema = z.object({
  id: z.string().uuid(),
  type: ConversationType,
  title: z.string().nullable(),
  characterId: z.string().uuid().nullable(),
  lastMessageAt: z.string().nullable(),
  createdAt: z.string(),
});

export type Conversation = z.infer<typeof ConversationSchema>;
