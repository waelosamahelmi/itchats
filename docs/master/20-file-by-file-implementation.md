# 20 — File-by-File Implementation Plan

## Overview

This document provides the complete migration and implementation plan for the ItChats-AI project. It lists every file that needs to be created, modified, or deleted, organized into phases with explicit dependencies.

**Execution environment:** Monorepo at `C:\Users\Wael Helmi\chat\itchats-ai\` with Turborepo, pnpm, NestJS API, React frontend.

**Database ORM:** Drizzle ORM with PostgreSQL 16+.

---

## Phase Ordering & Dependencies

```
Phase 1: Database Schema Migrations (Foundation)
    ↓
Phase 2: Contracts & Shared Types (Enables all other work)
    ↓
Phase 3: AI Core Package (Provider clients, costing, prompts)
    ↓
Phase 4: API — Character Identity (New identity fields + reference packs)
    ↓
Phase 5: API — Admin Endpoints (Admin panel backend)
    ↓
Phase 6: API — Autonomous Features (Story scheduler, relationship engine)
    ↓
Phase 7: Frontend — Character Creation (Wizard with autofill + reference packs)
    ↓
Phase 8: Frontend — Character Profile & DNA (Identity display)
    ↓
Phase 9: Frontend — Admin Panel (Full admin dashboard)
    ↓
Phase 10: Frontend — PWA & Mobile (Service workers, push, offline)
    ↓
Phase 11: Testing & Polish
```

---

## Phase 1: Database Schema Migrations

### 1.1 Character Identity Fields

**File:** `packages/database/src/schema/characters.ts`

**Action:** MODIFY — Add new columns to `characters` table

```typescript
// Add to existing characters pgTable definition:
canonicalName:         text('canonical_name'),
identityLock:          boolean('identity_lock').default(false),
nationality:           text('nationality'),
ethnicity:             text('ethnicity'),
height:                text('height'),
bodyType:              text('body_type'),
skinTone:              text('skin_tone'),
eyeColor:              text('eye_color'),
hair:                  text('hair'),
facialFeatures:        text('facial_features'),
tattoos:               text('tattoos'),
accessories:           text('accessories'),
wardrobe:              text('wardrobe'),
photographyStyle:      text('photography_style'),
emojiStyle:            text('emoji_style'),
energyLevel:           text('energy_level'),
confidence:            text('confidence'),
emotionalBaseline:     text('emotional_baseline'),
curiosity:             text('curiosity'),
optimism:              text('optimism'),
affection:             text('affection'),
jealousy:              text('jealousy'),
ambition:              text('ambition'),
intelligence:          text('intelligence'),
secrets:               jsonb('secrets').default([]),
goals:                 jsonb('goals').default([]),
fears:                 jsonb('fears').default([]),
routines:              jsonb('routines'),
sleepSchedule:         text('sleep_schedule'),
musicTaste:            text('music_taste'),
foodTaste:             text('food_taste'),
cameraStyle:           text('camera_style'),
selfieStyle:           text('selfie_style'),
storyStyle:            text('story_style'),
voiceModel:            text('voice_model'),
ttsVoice:              text('tts_voice'),
referencePackId:       uuid('reference_pack_id'),
typingProfile:         jsonb('typing_profile'),
```

**Migration:**
```bash
pnpm db:generate   # Generates SQL migration in packages/database/drizzle/
pnpm db:migrate    # Applies to database
```

### 1.2 Character Reference Packs

**File:** `packages/database/src/schema/characters.ts`

**Action:** ADD — New table definition

```typescript
export const characterReferencePacks = pgTable('character_reference_packs', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  characterVersionId: uuid('character_version_id').notNull().references(() => characterVersions.id),
  status: text('status').notNull().default('generating'), // generating/ready/approved/rejected
  canonicalSeed: bigint('canonical_seed', { mode: 'number' }),
  provider: text('provider').notNull().default('alibaba'),
  model: text('model').notNull().default('qwen-image-2.0-pro'),
  identityScore: numeric('identity_score', { precision: 6, scale: 4 }),
  generatedAt: timestamp('generated_at', { withTimezone: true }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### 1.3 Reference Image Enhancements

**File:** `packages/database/src/schema/characters.ts` (or `media.ts`)

**Action:** MODIFY — Add columns to `character_reference_assets`

```typescript
// Add to character_reference_assets:
prompt:           text('prompt'),
negativePrompt:   text('negative_prompt'),
seed:             bigint('seed', { mode: 'number' }),
// embedding:     vector('embedding', { dimensions: 1024 }), // Future: pgvector
identityScore:    numeric('identity_score', { precision: 6, scale: 4 }),
```

### 1.4 Relationship Enhancements

**File:** `packages/database/src/schema/social.ts`

**Action:** MODIFY — Add columns to `character_relationships`

```typescript
// Add to character_relationships:
comfort:          text('comfort'),
attachment:       text('attachment'),
curiosity:        text('curiosity'),
respect:          text('respect'),
chemistry:        text('chemistry'),
romance:          text('romance'),
humor:            text('humor'),
insideJokes:      jsonb('inside_jokes').default([]),
sharedMemories:   jsonb('shared_memories').default([]),
compatibility:    text('compatibility'),
lastConflict:     timestamp('last_conflict', { withTimezone: true }),
lastGift:         timestamp('last_gift', { withTimezone: true }),
daysKnown:        integer('days_known'),
conversationCount: integer('conversation_count'),
imageRequests:    integer('image_requests'),
voiceCalls:       integer('voice_calls'),
storiesViewed:    integer('stories_viewed'),
storiesLiked:     integer('stories_liked'),
```

### 1.5 Character-to-Character Social Tables

**File:** `packages/database/src/schema/social.ts`

**Action:** ADD — New tables

```typescript
export const characterCharacterFollows = pgTable('character_character_follows', {
  followerId: uuid('follower_id').notNull().references(() => characters.id),
  followingId: uuid('following_id').notNull().references(() => characters.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.followerId, table.followingId] })]);

export const characterFriendships = pgTable('character_friendships', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterIdA: uuid('character_id_a').notNull().references(() => characters.id),
  characterIdB: uuid('character_id_b').notNull().references(() => characters.id),
  status: text('status').notNull().default('acquaintance'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const characterEvents = pgTable('character_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  location: text('location'),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const characterEventAttendees = pgTable('character_event_attendees', {
  eventId: uuid('event_id').notNull().references(() => characterEvents.id),
  characterId: uuid('character_id').notNull().references(() => characters.id),
}, table => [primaryKey({ columns: [table.eventId, table.characterId] })]);

export const characterStoryComments = pgTable('character_story_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull(),
  characterId: uuid('character_id').notNull().references(() => characters.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const characterStoryViews = pgTable('character_story_views', {
  storyId: uuid('story_id').notNull(),
  characterId: uuid('character_id').notNull().references(() => characters.id),
  viewedAt: timestamp('viewed_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.storyId, table.characterId] })]);

export const characterStoryLikes = pgTable('character_story_likes', {
  storyId: uuid('story_id').notNull(),
  characterId: uuid('character_id').notNull().references(() => characters.id),
  likedAt: timestamp('liked_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.storyId, table.characterId] })]);
```

### 1.6 Prompt Templates Table

**File:** `packages/database/src/schema/prompts.ts`

**Action:** CREATE NEW FILE

```typescript
export const promptTemplates = pgTable('prompt_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(),
  name: text('name').notNull(),
  version: integer('version').notNull().default(1),
  content: text('content').notNull(),
  variables: jsonb('variables').notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

---

## Phase 2: Contracts & Shared Types

### 2.1 Zod Schemas

**File:** `packages/contracts/src/index.ts`

**Action:** MODIFY — Extend with new schemas

Add:
- `CharacterIdentitySchema` (all new identity fields)
- `CreateCharacterV2Schema` (extended character creation)
- `AutofillRequestSchema` / `AutofillResponseSchema`
- `ReferencePackSchema` / `ReferenceImageSchema`
- `ReferencePackApprovalSchema`
- `RegenerateIdentitySchema`
- `StoryGenerationSchema`
- `CostEstimateSchema`
- `PromptTemplateSchema` / `PromptTemplateUpsertSchema`
- `AdminModerationSchema`
- `PushSubscriptionSchema`

**Export all schemas** from `packages/contracts/src/index.ts`

### 2.2 TypeScript Types

**File:** `packages/contracts/src/types.ts`

**Action:** CREATE NEW FILE

```typescript
export interface CharacterIdentity {
  canonicalName: string;
  personality: string;
  backstory: string;
  // ... all new identity fields
}

export interface ReferencePack {
  id: string;
  characterId: string;
  status: 'generating' | 'ready' | 'approved' | 'rejected';
  images: ReferenceImage[];
  identityScore: number;
}

export interface ReferenceImage {
  id: string;
  referenceType: ReferenceType;
  url: string;
  prompt: string;
  seed: number;
  identityScore: number;
  approved: boolean;
}

export type ReferenceType = 'portrait' | 'portrait_smile' | 'portrait_side' | 'portrait_full'
  | 'selfie' | 'casual' | 'indoor' | 'outdoor' | 'sitting' | 'walking' | 'night' | 'formal';
```

---

## Phase 3: AI Core Package

### 3.1 Prompt Templates Module

**File:** `packages/ai-core/src/prompts/index.ts`

**Action:** CREATE NEW FILE

Export default prompt templates:
- `CHARACTER_PERSONALITY_TEMPLATE`
- `MEMORY_EXTRACTION_TEMPLATE`
- `IMAGE_GENERATION_TEMPLATE`
- `STORY_GENERATION_TEMPLATE`
- `IDENTITY_AUTOFILL_TEMPLATE`
- `IDENTITY_VERIFICATION_TEMPLATE`
- `RELATIONSHIP_ANALYSIS_TEMPLATE`

**File:** `packages/ai-core/src/prompts/render.ts`

**Action:** CREATE NEW FILE

```typescript
export function renderTemplate(template: string, variables: Record<string, any>): string
```

### 3.2 Identity Autofill Provider

**File:** `packages/ai-core/src/providers/identity-autofill.ts`

**Action:** CREATE NEW FILE

```typescript
export async function autofillIdentity(name: string, concept: string): Promise<CharacterIdentity>
```

Uses `qwen3.6-flash` with `IDENTITY_AUTOFILL_TEMPLATE` to generate full character DNA from name + concept.

### 3.3 Identity Verification Provider

**File:** `packages/ai-core/src/providers/identity-verify.ts`

**Action:** CREATE NEW FILE

```typescript
export async function verifyIdentity(
  canonical: CharacterIdentity,
  generated: { prompt: string; imageUrl?: string }
): Promise<{ consistencyScore: number; issues: string[] }>
```

### 3.4 Costing Module Enhancements

**File:** `packages/ai-core/src/costing.ts`

**Action:** MODIFY — Add new cost calculations

Add specific credit costs:
- `getCharacterCreationCost()`
- `getReferencePackCost(imageCount: number)`
- `getAutonomousStoryCost(withImage: boolean)`

---

## Phase 4: API — Character Identity

### 4.1 Character Creation Service (Major Enhancement)

**File:** `apps/api/src/characters/character-creation.service.ts`

**Action:** MODIFY — Add identity autofill, reference pack generation

New methods:
```typescript
async autofillCharacter(name: string, concept: string): Promise<CharacterIdentity>
async generateReferencePack(characterId: string): Promise<ReferencePack>
async approveReferencePack(characterId: string, packId: string): Promise<void>
async regeneratePublicIdentity(characterId: string, userId: string): Promise<Character>
async generateCharacterImage(characterId: string, userId: string): Promise<{ url: string }>
```

### 4.2 Characters Controller Enhancements

**File:** `apps/api/src/characters/characters.controller.ts`

**Action:** MODIFY — Add new endpoints

New routes:
```
POST   /v1/characters/:characterId/reference-pack/generate
POST   /v1/characters/:characterId/reference-pack/approve
GET    /v1/characters/:characterId/reference-pack
GET    /v1/characters/:characterId/versions
GET    /v1/characters/:characterId/versions/:versionId
POST   /v1/characters/:characterId/versions/:versionId/restore
```

### 4.3 Character Identity Module

**File:** `apps/api/src/characters/identity.module.ts`

**Action:** CREATE NEW FILE — NestJS module for identity-related endpoints

### 4.4 Reference Pack Service

**File:** `apps/api/src/characters/reference-pack.service.ts`

**Action:** CREATE NEW FILE

```typescript
@Injectable()
export class ReferencePackService {
  async generatePack(characterId: string): Promise<ReferencePack>
  async addImage(packId: string, type: ReferenceType, params: ImageParams): Promise<ReferenceImage>
  async calculateIdentityScore(packId: string): Promise<number>
  async approvePack(packId: string): Promise<void>
}
```

---

## Phase 5: API — Admin Endpoints

### 5.1 Admin Module

**File:** `apps/api/src/admin/admin.module.ts`

**Action:** MODIFY — Add new controllers and services

### 5.2 Admin Characters Controller

**File:** `apps/api/src/admin/characters.controller.ts`

**Action:** CREATE NEW FILE

```typescript
@Controller('v1/admin/characters')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCharactersController {
  // GET    / — List all characters
  // GET    /:id — Get character detail (full DNA)
  // PATCH  /:id — Moderate character
}
```

### 5.3 Admin Reference Packs Controller

**File:** `apps/api/src/admin/reference-packs.controller.ts`

**Action:** CREATE NEW FILE

```typescript
@Controller('v1/admin/reference-packs')
export class AdminRefPacksController {
  // GET    / — List all packs with filters
  // GET    /:id — Pack detail + review
  // POST   /:id/approve — Approve pack
  // POST   /:id/reject  — Reject pack
  // POST   /:id/regenerate-image — Regenerate single image
  // POST   /:id/verify — Force identity verification
}
```

### 5.4 Admin Generations Controller

**File:** `apps/api/src/admin/generations.controller.ts`

**Action:** CREATE NEW FILE

```typescript
@Controller('v1/admin/generations')
export class AdminGenerationsController {
  // GET    / — List all generation jobs
  // GET    /failed — Failed generations
  // POST   /:id/retry — Retry job
}
```

### 5.5 Admin Relationships Controller

**File:** `apps/api/src/admin/relationships.controller.ts`

**Action:** CREATE NEW FILE

```typescript
@Controller('v1/admin/relationships')
export class AdminRelationshipsController {
  // GET    /heatmap/:characterId — Relationship network data
  // GET    /:characterId — All relationships for character
}
```

### 5.6 Admin Memories Controller

**File:** `apps/api/src/admin/memories.controller.ts`

**Action:** CREATE NEW FILE

```typescript
@Controller('v1/admin/memories')
export class AdminMemoriesController {
  // GET    /:characterId/:userId — Browse memories
  // DELETE /:memoryId — Delete memory
  // DELETE /batch — Bulk delete
}
```

### 5.7 Admin Prompt Templates Controller

**File:** `apps/api/src/admin/prompts.controller.ts`

**Action:** CREATE NEW FILE

```typescript
@Controller('v1/admin/prompt-templates')
export class AdminPromptsController {
  // GET    / — List templates
  // POST   / — Create template
  // PATCH  /:id — Update template
  // POST   /:id/test — Test render template
}
```

### 5.8 Admin Analytics Controller

**File:** `apps/api/src/admin/analytics.controller.ts`

**Action:** CREATE NEW FILE

Dashboard, conversation, credit analytics endpoints.

---

## Phase 6: API — Autonomous Features

### 6.1 Story Scheduler Enhancement

**File:** `apps/api/src/stories/story-scheduler.service.ts`

**Action:** MODIFY — Full autonomous story generation

Enhance to:
- Read character schedule, emotion state
- Generate contextual stories using AI
- Enforce moderation gate (optional)
- Generate images for stories (optional)
- Handle character-to-character social interactions

### 6.2 Relationship Engine

**File:** `apps/api/src/relationships/relationship-engine.service.ts`

**Action:** CREATE NEW FILE

```typescript
@Injectable()
export class RelationshipEngineService {
  async updateRelationship(characterId: string, userId: string, quality: InteractionQuality): Promise<void>
  async calculateCompatibility(characterId: string, userId: string): Promise<number>
  async getRelationshipHeatmap(characterId: string): Promise<RelationshipNetwork>
}
```

### 6.3 Autonomous Service

**File:** `apps/api/src/autonomous/autonomous.service.ts`

**Action:** CREATE NEW FILE

```typescript
@Injectable()
export class AutonomousService {
  async tick(): Promise<void> // Called on schedule
  async simulateDay(characterId: string): Promise<void>
  async updateCharacterSchedule(characterId: string): Promise<void>
}
```

---

## Phase 7: Frontend — Character Creation

### 7.1 CreateCharacterPage (Complete Rewrite)

**File:** `apps/web/src/features/ai/CreateCharacterPage.tsx`

**Action:** REWRITE — Multi-step wizard with autofill

Add:
- Step 1: Name, concept, basics
- Step 2: Identity details (autofill or manual)
- Step 3: Reference pack generation + review
- Progress indicator
- Draft save functionality

### 7.2 Character Autofill Component

**File:** `apps/web/src/features/ai/AutofillPanel.tsx`

**Action:** CREATE NEW FILE

UI for:
- "Autofill with AI" button
- Loading state during autofill
- Display autofill results with edit capability
- Confirm/regenerate options

### 7.3 Reference Pack Generator

**File:** `apps/web/src/features/ai/ReferencePackGenerator.tsx`

**Action:** CREATE NEW FILE

UI for:
- Reference pack generation progress (12-16 images)
- Image preview grid
- Per-image approve/reject
- Identity score display
- "Lock Identity" confirmation

### 7.4 Redux Character Slice Extension

**File:** `apps/web/src/app/store.ts`

**Action:** MODIFY — Add character creation thunks

```typescript
export const autofillCharacter = createAsyncThunk('chars/autofill', async ({ name, concept }) => { ... });
export const createCharacterV2 = createAsyncThunk('chars/createV2', async (data) => { ... });
export const generateReferencePack = createAsyncThunk('chars/refPack', async (charId) => { ... });
export const approveReferencePack = createAsyncThunk('chars/approvePack', async ({ charId, packId }) => { ... });
```

---

## Phase 8: Frontend — Character Profile & DNA

### 8.1 CharacterProfilePage Enhancement

**File:** `apps/web/src/features/ai/CharacterProfilePage.tsx`

**Action:** MODIFY — Add DNA view, reference pack preview

Add:
- Character DNA section (all identity fields)
- Reference pack image gallery
- Identity score badge
- Version history link
- Relationship stats for viewing user

### 8.2 Character DNA Viewer Component

**File:** `apps/web/src/features/ai/CharacterDNAViewer.tsx`

**Action:** CREATE NEW FILE

Read-only display of all character identity fields with sections:
- Core Identity
- Personality Traits (with visual sliders/bars)
- Physical Appearance
- Behavioral Patterns
- Lifestyle
- Psychological Profile

---

## Phase 9: Frontend — Admin Panel

### 9.1 Admin Panel App Structure

```
apps/admin/src/
├── app/
│   ├── store.ts             ← MODIFY — Add all admin slices
│   └── router.tsx           ← MODIFY — Add all admin routes
├── features/
│   ├── dashboard/
│   │   └── DashboardPage.tsx    ← CREATE
│   ├── characters/
│   │   └── AdminCharacters.tsx  ← CREATE
│   ├── reference-packs/
│   │   └── RefPackReview.tsx    ← CREATE
│   ├── identity/
│   │   ├── IdentityVersions.tsx ← CREATE
│   │   └── IdentityVerify.tsx   ← CREATE
│   ├── image-queue/
│   │   └── ImageQueue.tsx       ← CREATE
│   ├── relationships/
│   │   └── RelationshipHeatmap.tsx ← CREATE
│   ├── stories/
│   │   └── StoryQueue.tsx       ← CREATE
│   ├── autonomous/
│   │   └── AutonomousChars.tsx  ← CREATE
│   ├── prompts/
│   │   └── PromptEditor.tsx     ← CREATE
│   ├── memories/
│   │   └── MemoryBrowser.tsx    ← CREATE
│   ├── analytics/
│   │   └── ConversationAnalytics.tsx ← CREATE
│   ├── generations/
│   │   └── FailedGenerations.tsx ← CREATE
│   └── moderation/
│       └── ModerationPanel.tsx  ← CREATE
└── components/
    ├── DataTable.tsx            ← CREATE
    ├── StatusBadge.tsx          ← CREATE
    ├── FilterBar.tsx            ← CREATE
    └── RelationshipGraph.tsx    ← CREATE
```

### 9.2 Files to CREATE (Admin Panel)

| # | File | Description |
|---|------|-------------|
| 1 | `apps/admin/src/app/store.ts` | Redux store with all admin slices |
| 2 | `apps/admin/src/app/router.tsx` | Admin routes |
| 3 | `apps/admin/src/features/dashboard/DashboardPage.tsx` | Analytics dashboard |
| 4 | `apps/admin/src/features/characters/AdminCharacters.tsx` | Character management |
| 5 | `apps/admin/src/features/reference-packs/RefPackReview.tsx` | Reference pack review |
| 6 | `apps/admin/src/features/identity/IdentityVersions.tsx` | Version history |
| 7 | `apps/admin/src/features/identity/IdentityVerify.tsx` | Identity verification |
| 8 | `apps/admin/src/features/image-queue/ImageQueue.tsx` | Generation queue |
| 9 | `apps/admin/src/features/relationships/RelationshipHeatmap.tsx` | Heatmap |
| 10 | `apps/admin/src/features/stories/StoryQueue.tsx` | Story moderation |
| 11 | `apps/admin/src/features/autonomous/AutonomousChars.tsx` | Autonomous management |
| 12 | `apps/admin/src/features/prompts/PromptEditor.tsx` | Template editor |
| 13 | `apps/admin/src/features/memories/MemoryBrowser.tsx` | Memory browser |
| 14 | `apps/admin/src/features/analytics/ConversationAnalytics.tsx` | Analytics |
| 15 | `apps/admin/src/features/generations/FailedGenerations.tsx` | Failed jobs |
| 16 | `apps/admin/src/features/moderation/ModerationPanel.tsx` | Moderation |
| 17 | `apps/admin/src/components/DataTable.tsx` | Reusable table |
| 18 | `apps/admin/src/components/StatusBadge.tsx` | Status indicator |
| 19 | `apps/admin/src/components/FilterBar.tsx` | Search + filters |
| 20 | `apps/admin/src/components/RelationshipGraph.tsx` | D3 force graph |

---

## Phase 10: Frontend — PWA & Mobile

### 10.1 Web App Manifest

**File:** `apps/web/public/manifest.json`

**Action:** CREATE

### 10.2 Service Worker

**File:** `apps/web/public/sw.js`

**Action:** CREATE

Handles: push notifications, offline caching, background sync.

### 10.3 Push Notification Integration

**File:** `apps/web/src/hooks/usePushNotifications.ts`

**Action:** CREATE NEW FILE

```typescript
export function usePushNotifications() {
  // subscribeToPush, unsubscribeFromPush, permission state
}
```

### 10.4 Offline Detection Hook

**File:** `apps/web/src/hooks/useOnlineStatus.ts`

**Action:** CREATE NEW FILE

### 10.5 Offline Banner Component

**File:** `apps/web/src/components/OfflineBanner.tsx`

**Action:** CREATE NEW FILE

### 10.6 PWA Install Prompt

**File:** `apps/web/src/components/InstallPrompt.tsx`

**Action:** CREATE NEW FILE

### 10.7 Vite PWA Plugin Config

**File:** `apps/web/vite.config.ts`

**Action:** MODIFY — Add `VitePWA` plugin

### 10.8 Notification Preferences Page

**File:** `apps/web/src/features/settings/NotificationSettings.tsx`

**Action:** CREATE NEW FILE

---

## Phase 11: Testing & Polish

### 11.1 API Tests

| File | Action |
|------|--------|
| `apps/api/src/characters/characters.controller.spec.ts` | CREATE — Test new endpoints |
| `apps/api/src/admin/**.controller.spec.ts` | CREATE — Admin endpoint tests |
| `apps/api/src/ai/ai.service.spec.ts` | MODIFY — Test identity features |

### 11.2 Frontend Tests

| File | Action |
|------|--------|
| `apps/web/src/features/ai/CreateCharacterPage.test.tsx` | CREATE |
| `apps/web/src/features/ai/CharacterProfilePage.test.tsx` | MODIFY |

### 11.3 E2E Tests

No E2E framework configured yet. Future: Playwright tests covering:
- Character creation flow
- Chat with character
- Story viewing
- Admin panel operations

---

## Complete File Manifest

### Files to CREATE

```
# Database
packages/database/src/schema/prompts.ts

# Contracts
packages/contracts/src/types.ts

# AI Core
packages/ai-core/src/prompts/index.ts
packages/ai-core/src/prompts/render.ts
packages/ai-core/src/providers/identity-autofill.ts
packages/ai-core/src/providers/identity-verify.ts

# API — Characters
apps/api/src/characters/identity.module.ts
apps/api/src/characters/reference-pack.service.ts
apps/api/src/characters/reference-pack.controller.ts

# API — Admin
apps/api/src/admin/characters.controller.ts
apps/api/src/admin/reference-packs.controller.ts
apps/api/src/admin/generations.controller.ts
apps/api/src/admin/relationships.controller.ts
apps/api/src/admin/memories.controller.ts
apps/api/src/admin/prompts.controller.ts
apps/api/src/admin/analytics.controller.ts
apps/api/src/admin/notifications.controller.ts

# API — Autonomous
apps/api/src/relationships/relationship-engine.service.ts
apps/api/src/autonomous/autonomous.service.ts

# Frontend — Character
apps/web/src/features/ai/AutofillPanel.tsx
apps/web/src/features/ai/ReferencePackGenerator.tsx
apps/web/src/features/ai/CharacterDNAViewer.tsx

# Frontend — Components
apps/web/src/components/OfflineBanner.tsx
apps/web/src/components/InstallPrompt.tsx
apps/web/src/hooks/usePushNotifications.ts
apps/web/src/hooks/useOnlineStatus.ts
apps/web/src/features/settings/NotificationSettings.tsx

# PWA
apps/web/public/manifest.json
apps/web/public/sw.js
apps/web/public/icons/icon-192.png
apps/web/public/icons/icon-512.png
apps/web/public/icons/badge-72.png

# Admin — All 20 files listed in Phase 9.2
# (see Phase 9 for full admin file list)
```

### Files to MODIFY

```
packages/database/src/schema/characters.ts    — New columns + tables
packages/database/src/schema/social.ts        — New relationship columns + tables
packages/contracts/src/index.ts               — New schemas
packages/ai-core/src/costing.ts               — New cost functions
apps/api/src/characters/characters.controller.ts   — New endpoints
apps/api/src/characters/characters.service.ts      — New identity methods
apps/api/src/characters/character-creation.service.ts — Major enhancement
apps/api/src/admin/admin.module.ts                  — New controllers
apps/api/src/stories/story-scheduler.service.ts     — Autonomous features
apps/api/src/ai/ai.service.ts                       — Identity-aware generation
apps/api/src/conversations/chat.gateway.ts          — New WS events
apps/web/src/app/store.ts                           — New thunks
apps/web/src/app/router.tsx                         — New routes
apps/web/src/features/ai/CreateCharacterPage.tsx    — Complete rewrite
apps/web/src/features/ai/CharacterProfilePage.tsx   — DNA viewer
apps/web/src/features/chats/ChatPage.tsx            — AI streaming
apps/web/src/features/admin/AdminPanelPage.tsx      — New admin routes
apps/web/vite.config.ts                             — PWA plugin
apps/web/index.html                                 — PWA meta tags
apps/admin/src/app/store.ts                         — Admin slices
apps/admin/src/app/router.tsx                       — Admin routes
```

---

## DeepSeek/Codex Execution Instructions

### For DeepSeek (or any AI coding agent)

When executing each phase, use the following prompt template:

```
You are implementing Phase {N} of the ItChats-AI migration plan.
Read docs/master/20-file-by-file-implementation.md for the full plan.

Your task: Implement all files listed under Phase {N}.

WORKSPACE: C:\Users\Wael Helmi\chat\itchats-ai\

Rules:
1. Read the existing code before modifying any file
2. Follow the existing code style and patterns
3. Use Drizzle ORM for all database operations
4. Use Zod for all validation schemas
5. Write complete, working implementations — not stubs
6. After each file, verify it compiles (pnpm typecheck if available)
7. If a migration is needed, run: pnpm db:generate && pnpm db:migrate
8. Report any blockers immediately

Phase-specific instructions:
{phase-specific notes}
```

### Phase Execution Order

Execute phases sequentially. Each phase must complete before starting the next:

```
Phase 1  → Agent 1: Database migrations
Phase 2  → Agent 2: Contracts & types (after Phase 1 complete)
Phase 3  → Agent 3: AI Core package (after Phase 2 complete)
Phase 4  → Agent 4: API — Character Identity (after Phase 3 complete)
Phase 5  → Agent 5: API — Admin Endpoints (after Phase 4 complete)
Phase 6  → Agent 6: API — Autonomous Features (after Phase 5 complete)
Phase 7  → Agent 7: Frontend — Character Creation (after Phase 6 complete)
Phase 8  → Agent 8: Frontend — Profile & DNA (after Phase 7 complete)
Phase 9  → Agent 9: Frontend — Admin Panel (after Phase 8 complete)
Phase 10 → Agent 10: Frontend — PWA & Mobile (after Phase 9 complete)
Phase 11 → Agent 11: Testing (after Phase 10 complete)
```

Phases 7-10 can potentially be parallelized (different frontend areas), but serial execution is safer to avoid merge conflicts.

### Parallelization Strategy (Advanced)

| Group | Phases | Can Run In Parallel |
|-------|--------|---------------------|
| Foundation | 1, 2, 3 | No — sequential dependencies |
| Backend | 4, 5, 6 | 5 and 6 can overlap (different modules) |
| Frontend | 7, 8, 9, 10 | 7→8 sequential; 9, 10 can be parallel with 7-8 |

### Verification after Each Phase

```bash
# After Phase 1
pnpm db:generate
pnpm db:migrate
pnpm --filter @itchats/database typecheck

# After Phase 2
pnpm --filter @itchats/contracts build

# After Phase 3
pnpm --filter @itchats/ai-core build

# After Phases 4-6
pnpm --filter @itchats/api build
pnpm --filter @itchats/api start:dev  # Verify server starts

# After Phases 7-10
pnpm --filter @itchats/web build
pnpm --filter @itchats/web dev        # Verify app loads
pnpm --filter @itchats/admin build    # Verify admin builds

# After Phase 11
pnpm test                             # Run all tests
```

### Rollback Plan

If any phase fails:
1. The database migration is the only destructive operation
2. Use `pnpm db:drop` (if configured) or manually revert migration SQL
3. Git revert the failed phase's commits
4. Re-run the phase with corrected approach

### Estimated Time per Phase

| Phase | Files | Estimated Time |
|-------|-------|:---:|
| Phase 1 | 5 modified | 1-2 hours |
| Phase 2 | 2 new/modified | 1 hour |
| Phase 3 | 5 new/modified | 2-3 hours |
| Phase 4 | 4 new/modified | 3-4 hours |
| Phase 5 | 8 new | 4-6 hours |
| Phase 6 | 3 new/modified | 3-4 hours |
| Phase 7 | 4 modified/new | 3-4 hours |
| Phase 8 | 2 new/modified | 2-3 hours |
| Phase 9 | 20 new | 8-12 hours |
| Phase 10 | 10 new/modified | 3-4 hours |
| Phase 11 | 4 new/modified | 2-3 hours |

**Total estimated time:** 32-46 hours across all phases.

---

## Critical Path

The critical path (longest chain of dependent phases):

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 7 → Phase 8 → Phase 11
(Database → Contracts → AI Core → API Identity → Frontend Creation → Profile → Tests)
```

Admin panel (Phases 5, 9) and PWA (Phase 10) are parallelizable but add to total scope.

---

## Git Branch Strategy

```bash
git checkout -b feat/full-identity-system

# After each phase:
git add -A
git commit -m "Phase N: {description}"
git push origin feat/full-identity-system
```

Merge to `main` only after all phases complete and tests pass.
