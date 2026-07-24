import { z } from 'zod';

export const imagePromptSchema = z.string().min(1).max(4000);
export const getGenerationIdSchema = () => z.string().uuid();

export const validateImagePrompt = (prompt: unknown) => imagePromptSchema.parse(prompt);
