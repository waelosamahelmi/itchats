import { z } from 'zod';

export const UserStatus = z.enum(['pending', 'active', 'suspended', 'deleted']);
export type UserStatus = z.infer<typeof UserStatus>;

export const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(128),
  dateOfBirth: z.string().optional(),
  agreedToTerms: z.boolean().optional(),
  gender: z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say']).optional(),
  lookingFor: z.enum(['friends', 'relationships', 'both']).optional(),
  interestedIn: z.enum(['men', 'women', 'everyone']).optional(),
});

export const WizardSaveSchema = z.object({
  displayName: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  referrer: z.string().max(100).optional(),
  avatarUrl: z.string().optional(),
  preferredLanguage: z.string().max(10).optional(),
  autoTranslate: z.boolean().optional(),
  theme: z.enum(['dark', 'light']).optional(),
  followedCharacterIds: z.array(z.string().uuid()).optional(),
  wizardCompleted: z.boolean().optional(),
  gender: z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say']).optional(),
  lookingFor: z.enum(['friends', 'relationships', 'both']).optional(),
  interestedIn: z.enum(['men', 'women', 'everyone']).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string(),
  displayName: z.string().nullable(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.string(),
  status: UserStatus,
  createdAt: z.string(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type WizardSaveInput = z.infer<typeof WizardSaveSchema>;
