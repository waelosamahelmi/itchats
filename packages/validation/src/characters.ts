import { z } from 'zod';

export const characterNameSchema = z.string().min(1).max(100);
export const characterHandleSchema = z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/);
export const characterDescriptionSchema = z.string().max(500);
export const characterPersonalitySchema = z.string().max(2000);
export const characterBackstorySchema = z.string().max(2000);

export const validateCharacterName = (name: unknown) => characterNameSchema.parse(name);
export const validateCharacterHandle = (handle: unknown) => characterHandleSchema.parse(handle);
