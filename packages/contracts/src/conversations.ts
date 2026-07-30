import { z } from 'zod';

export const ConversationType = z.enum(['human_human', 'human_character', 'group']);
export type ConversationType = z.infer<typeof ConversationType>;
export const ConversationMode = z.enum(['chat', 'roleplay']);
export type ConversationMode = z.infer<typeof ConversationMode>;

export const ConversationSchema = z.object({
  id: z.string().uuid(),
  type: ConversationType,
  mode: ConversationMode,
  title: z.string().nullable(),
  characterId: z.string().uuid().nullable(),
  lastMessageAt: z.string().nullable(),
  createdAt: z.string(),
});

export type Conversation = z.infer<typeof ConversationSchema>;
