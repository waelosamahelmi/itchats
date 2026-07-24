import { z } from 'zod';

export const emailSchema = z.string().email();
export const usernameSchema = z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/);
export const passwordSchema = z.string().min(8).max(128);

export const validateEmail = (email: unknown) => emailSchema.parse(email);
export const validateUsername = (username: unknown) => usernameSchema.parse(username);
export const validatePassword = (password: unknown) => passwordSchema.parse(password);
