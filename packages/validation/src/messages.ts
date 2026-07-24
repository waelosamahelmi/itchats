import { z } from 'zod';

export const messageContentSchema = z.string().min(1).max(10000);
export const validateMessageContent = (content: unknown) => messageContentSchema.parse(content);
