# 02 — Database Schema

## Current State vs. Target

The current schema already implements many of the fields described in the architecture plan.
Below is the complete target schema, with ✅ marking what already exists and ⚡ marking new additions.

---

## Core Tables

### characters ✅ (with additions ⚡)

| Column | Type | Status | Description |
|--------|------|--------|-------------|
| id | uuid PK | ✅ | |
| ownerUserId | uuid FK→users | ✅ | Creator |
| name | text | ✅ | |
| handle | text UNIQUE | ✅ | @username |
| visibility | enum(private/public/unlisted) | ✅ | |
| status | enum(draft/generating_identity/ready/published/suspended/disabled/deleted) | ✅ | |
| identityOrigin | enum | ✅ | How identity was created |
| identityVersion | integer | ✅ | Increments on regeneration |
| avatarMediaId | uuid | ✅ | Current avatar |
| description | text | ✅ | Bio/appearance |
| personality | text | ✅ | Personality traits |
| backstory | text | ✅ | Origin story |
| ageDisplay | text | ✅ | e.g. "mid-20s" |
| gender | text | ✅ | |
| pronouns | text | ✅ | |
| occupation | text | ✅ | |
| interests | jsonb | ✅ | string[] |
| dislikes | jsonb | ✅ | string[] |
| valuesJson | jsonb | ✅ | string[] |
| speakingStyle | text | ✅ | How they talk |
| humorStyle | text | ✅ | |
| languages | jsonb | ✅ | string[], default ["en"] |
| defaultLanguage | text | ✅ | |
| emotionState | jsonb | ✅ | {mood, energy, currentActivity} |
| autonomyConfig | jsonb | ✅ | {level, cadence} |
| contentStyle | jsonb | ✅ | Story/image style preferences |
| moderationStatus | enum | ✅ | |
| isAiDisclosureRequired | text | ✅ | |
| publishedAt | timestamp | ✅ | |
| createdAt/updatedAt/deletedAt | timestamp | ✅ | Soft delete |
| ⚡ canonicalName | text | NEW | Immutable identity name |
| ⚡ identityLock | boolean | NEW | True after reference pack approved |
| ⚡ nationality | text | NEW | |
| ⚡ ethnicity | text | NEW | |
| ⚡ height | text | NEW | e.g. "5'8\"" |
| ⚡ bodyType | text | NEW | |
| ⚡ skinTone | text | NEW | |
| ⚡ eyeColor | text | NEW | |
| ⚡ hair | text | NEW | Hair description |
| ⚡ facialFeatures | text | NEW | Distinctive features |
| ⚡ tattoos | text | NEW | |
| ⚡ accessories | text | NEW | Signature accessories |
| ⚡ wardrobe | text | NEW | Style description |
| ⚡ photographyStyle | text | NEW | Preferred photo style |
| ⚡ emojiStyle | text | NEW | Emoji usage pattern |
| ⚡ energyLevel | text | NEW | 0-10 |
| ⚡ confidence | text | NEW | 0-1 |
| ⚡ emotionalBaseline | text | NEW | Default mood |
| ⚡ curiosity | text | NEW | 0-1 |
| ⚡ optimism | text | NEW | 0-1 |
| ⚡ affection | text | NEW | 0-1 |
| ⚡ jealousy | text | NEW | 0-1 |
| ⚡ ambition | text | NEW | 0-1 |
| ⚡ intelligence | text | NEW | 0-1 |
| ⚡ secrets | jsonb | NEW | string[] |
| ⚡ goals | jsonb | NEW | string[] |
| ⚡ fears | jsonb | NEW | string[] |
| ⚡ routines | jsonb | NEW | Daily schedule |
| ⚡ sleepSchedule | text | NEW | "23:00-07:00" |
| ⚡ musicTaste | text | NEW | |
| ⚡ foodTaste | text | NEW | |
| ⚡ cameraStyle | text | NEW | Preferred camera style |
| ⚡ selfieStyle | text | NEW | Selfie aesthetics |
| ⚡ storyStyle | text | NEW | Story preferences |
| ⚡ voiceModel | text | NEW | Preferred voice model |
| ⚡ ttsVoice | text | NEW | TTS voice key |
| ⚡ referencePackId | uuid | NEW | FK→character_reference_packs |
| ⚡ typingProfile | jsonb | NEW | {avgWords, emojiFreq, capitalization, ...} |

### character_versions ✅

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| characterId | uuid FK | |
| version | integer | Incrementing version number |
| canonicalPrompt | text | The exact prompt that generates this identity |
| negativePrompt | text | What to avoid |
| structuredIdentity | jsonb | Full identity snapshot |
| sourceIdentityOrigin | enum | |
| lockedAt | timestamp | When this version was locked |
| createdAt | timestamp | |

### character_reference_packs ⚡ NEW

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| characterId | uuid FK | |
| characterVersionId | uuid FK | Which version this pack belongs to |
| status | enum(generating/ready/approved/rejected) | |
| canonicalSeed | bigint | The seed that produced the canonical face |
| provider | text | "alibaba" |
| model | text | "qwen-image-2.0-pro" |
| identityScore | numeric(6,4) | Aggregate identity consistency score (0-1) |
| generatedAt | timestamp | |
| approvedAt | timestamp | |
| createdAt | timestamp | |

### character_reference_images ✅ (exists as character_reference_assets)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| characterId | uuid FK | |
| characterVersionId | uuid FK | |
| mediaAssetId | uuid FK | |
| referenceType | text | portrait/selfie/casual/indoor/outdoor/sitting/walking/night/formal/portrait_smile/portrait_side/portrait_full |
| sortOrder | integer | |
| generationJobId | uuid | |
| approved | boolean | |
| qualityScore | numeric(6,4) | |
| ⚡ prompt | text | NEW — The exact prompt used |
| ⚡ negativePrompt | text | NEW |
| ⚡ seed | bigint | NEW |
| ⚡ embedding | vector(1024) | NEW — Face embedding for identity verification |
| ⚡ identityScore | numeric(6,4) | NEW — How well this image matches the canonical identity |
| createdAt | timestamp | |

### character_voice_profiles ✅

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| characterId | uuid FK | |
| providerId | text | |
| modelKey | text | |
| voiceKey | text | |
| language | text | |
| speed | text | |
| pitch | text | |
| style | jsonb | |
| previewMediaId | uuid | |
| active | text | |
| createdAt/updatedAt | timestamp | |

### character_locations ✅

| Column | Type | Description |
|--------|------|-------------|
| characterId | uuid PK/FK | |
| city | text | |
| region | text | |
| countryCode | text | |
| timezone | text | |
| publicPointLon/Lat | text | Fuzzy coordinates |
| locationLabel | text | |
| source | text | "declared" |
| precisionMeters | integer | Default 5000 |
| updatedAt | timestamp | |

---

## Relationship Tables

### character_relationships ✅ (with additions ⚡)

| Column | Type | Status | Description |
|--------|------|--------|-------------|
| id | uuid PK | ✅ | |
| characterId | uuid FK | ✅ | |
| userId | uuid FK | ✅ | |
| visibleLevel | text | ✅ | Computed relationship level (1-10) |
| familiarity | text | ✅ | 0-1 |
| trust | text | ✅ | 0-1 |
| warmth | text | ✅ | 0-1 |
| affinity | text | ✅ | 0-1 |
| tension | text | ✅ | 0-1 |
| interactionCount | integer | ✅ | |
| lastInteractionAt | timestamp | ✅ | |
| metadata | jsonb | ✅ | |
| ⚡ comfort | text | NEW | 0-1 |
| ⚡ attachment | text | NEW | 0-1 |
| ⚡ curiosity | text | NEW | 0-1 |
| ⚡ respect | text | NEW | 0-1 |
| ⚡ chemistry | text | NEW | 0-1 |
| ⚡ romance | text | NEW | 0-1 |
| ⚡ humor | text | NEW | Shared humor 0-1 |
| ⚡ insideJokes | jsonb | NEW | string[] |
| ⚡ sharedMemories | jsonb | NEW | Key moment references |
| ⚡ compatibility | text | NEW | 0-1 |
| ⚡ lastConflict | timestamp | NEW | |
| ⚡ lastGift | timestamp | NEW | |
| ⚡ daysKnown | integer | NEW | |
| ⚡ conversationCount | integer | NEW | |
| ⚡ imageRequests | integer | NEW | |
| ⚡ voiceCalls | integer | NEW | |
| ⚡ storiesViewed | integer | NEW | |
| ⚡ storiesLiked | integer | NEW | |

---

## Memory Table

### character_memories ✅

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| characterId | uuid FK | |
| userId | uuid FK | |
| conversationId | uuid FK | |
| content | text | The memory text |
| memoryType | text | identity_fact/preference/relationship_event/promise/recurring_topic/sensitive_fact/temporary_context |
| importance | numeric(5,4) | 0-1 |
| confidence | numeric(5,4) | 0-1 |
| sourceMessageIds | uuid[] | |
| lastRecalledAt | timestamp | |
| recallCount | integer | |
| expiresAt | timestamp | |
| createdAt/updatedAt | timestamp | |

Current memory types are sufficient. Future enhancement: add embedding column (pgvector).

---

## Social Graph Tables ✅

| Table | Status | Description |
|-------|--------|-------------|
| character_follows | ✅ | User→Character follows |
| content_likes | ✅ | Polymorphic likes |
| comments | ✅ | Polymorphic comments |
| user_blocks | ✅ | Block user or character |
| reports | ✅ | Content reports |
| notifications | ✅ | User notifications |

### ⚡ NEW: character-to-character social tables

```
character_character_follows  — Character A follows Character B
character_friendships        — Bidirectional friendship state
character_blocks             — Character blocks another character
character_events             — Characters attending events together
character_story_comments     — Character comments on another's story
character_story_views        — Character views another's story
character_story_likes        — Character likes another's story
```

---

## Story Tables ✅

| Table | Description |
|-------|-------------|
| stories | Story content with auto-generated flag |
| story_views | Viewer tracking |

---

## Billing/Treasury ✅

Complete billing system including:
- `treasury_journals`, `treasury_ledger_entries`, `treasury_accounts`
- `provider_treasury_accounts`, `provider_prices`, `provider_usage_events`
- `usage_reservations`, `webhook_events`, `treasury_snapshots`
- `margin_policies`, `billing_alerts`, `provider_invoices`
- `credit_wallets`, `credit_ledger`

---

## Migrations Strategy

1. Add new columns to `characters` with `ALTER TABLE ... ADD COLUMN` (nullable, with defaults)
2. Create `character_reference_packs` table
3. Add new columns to `character_reference_assets`
4. Add new columns to `character_relationships`
5. Create character-to-character social tables
6. Backfill existing characters with AI-generated identity details

All migrations use Drizzle's `pgTable` definitions. Run via:
```bash
pnpm db:generate   # Generate SQL migration
pnpm db:migrate    # Apply to database
```
