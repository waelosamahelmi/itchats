import { z } from 'zod';

export const MessageType = z.enum(['text', 'image', 'video', 'audio', 'voice_note', 'system']);
export type MessageType = z.infer<typeof MessageType>;

export const MessageSenderType = z.enum(['user', 'character', 'system']);
export type MessageSenderType = z.infer<typeof MessageSenderType>;

export const SendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(10000),
  type: MessageType.default('text'),
  clientIdempotencyKey: z.string().uuid(),
  replyToMessageId: z.string().uuid().optional(),
});

export const MessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  senderType: MessageSenderType,
  senderUserId: z.string().uuid().nullable(),
  senderCharacterId: z.string().uuid().nullable(),
  type: MessageType,
  content: z.string().nullable(),
  replyToMessageId: z.string().uuid().nullable(),
  createdAt: z.string(),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type Message = z.infer<typeof MessageSchema>;
