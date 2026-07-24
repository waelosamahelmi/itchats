import { z } from 'zod';

export const CharacterVisibility = z.enum(['private', 'public', 'unlisted']);
export type CharacterVisibility = z.infer<typeof CharacterVisibility>;

export const CharacterStatus = z.enum([
  'draft',
  'generating_identity',
  'ready',
  'published',
  'suspended',
  'disabled',
  'deleted',
]);
export type CharacterStatus = z.infer<typeof CharacterStatus>;

export const IdentityOrigin = z.enum([
  'text_generated',
  'private_text_generated',
  'private_uploaded_reference',
  'private_image_to_image',
  'public_regenerated_from_private_metadata',
]);
export type IdentityOrigin = z.infer<typeof IdentityOrigin>;

export const CreateCharacterSchema = z.object({
  name: z.string().min(1).max(100),
  handle: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  visibility: CharacterVisibility,
  description: z.string().max(500).optional(),
  personality: z.string().max(2000).optional(),
  backstory: z.string().max(2000).optional(),
  ageDisplay: z.string().max(50).optional(),
  gender: z.string().max(50).optional(),
  pronouns: z.string().max(50).optional(),
  occupation: z.string().max(100).optional(),
  interests: z.array(z.string().max(100)).max(20).optional(),
  languages: z.array(z.string().max(10)).max(10).optional(),
  defaultLanguage: z.string().max(10).optional(),
  city: z.string().max(200).optional(),
  countryCode: z.string().max(3).optional(),
  timezone: z.string().max(50).optional(),
  autonomyLevel: z.enum(['off', 'low', 'normal', 'high']).optional(),
  storyCadence: z.enum(['manual', 'daily', 'every_2_days', 'every_3_days']).optional(),
});

export type CreateCharacterInput = z.infer<typeof CreateCharacterSchema>;

export const CharacterResponseSchema = z.object({
  id: z.string().uuid(),
  ownerUserId: z.string().uuid(),
  name: z.string(),
  handle: z.string().nullable(),
  visibility: CharacterVisibility,
  status: CharacterStatus,
  identityOrigin: IdentityOrigin,
  avatarUrl: z.string().nullable(),
  description: z.string(),
  personality: z.string(),
  backstory: z.string(),
  ageDisplay: z.string().nullable(),
  gender: z.string().nullable(),
  pronouns: z.string().nullable(),
  occupation: z.string().nullable(),
  interests: z.array(z.string()),
  languages: z.array(z.string()),
  defaultLanguage: z.string(),
  isPublic: z.boolean(),
  followerCount: z.number().int().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CharacterResponse = z.infer<typeof CharacterResponseSchema>;
