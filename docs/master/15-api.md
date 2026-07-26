# 15 — REST API Specification

## Overview

| Item | Detail |
|------|--------|
| Base URL | `/v1` |
| Content-Type | `application/json` |
| Real-time | WebSocket at `/ws` (Socket.IO) |
| Auth | JWT Bearer token in `Authorization` header |
| Streaming | SSE for AI chat responses, WebSocket for messages |
| Idempotency | `Idempotency-Key` header supported on POST/PUT |

---

## Authentication

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/v1/auth/register` | None | Create account |
| `POST` | `/v1/auth/login` | None | Login |
| `POST` | `/v1/auth/refresh` | None | Refresh access token |
| `POST` | `/v1/auth/logout` | JWT | Invalidate current session |
| `POST` | `/v1/auth/logout-all` | JWT | Invalidate all sessions |
| `GET` | `/v1/auth/google` | None | Initiate Google OAuth flow |
| `GET` | `/v1/auth/google/callback` | None | Google OAuth callback |
| `POST` | `/v1/auth/link/google` | JWT | Link Google account |
| `POST` | `/v1/auth/forgot-password` | None | Request password reset |
| `POST` | `/v1/auth/reset-password` | None | Reset password with token |

### Register

```
POST /v1/auth/register
```

**Request Body (JSON):**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!"
}
```

**Validation:** `RegisterSchema` from `@itchats/contracts`

**Response 201:**
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "expiresIn": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "role": "user"
  }
}
```

### Login

```
POST /v1/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Validation:** `LoginSchema` from `@itchats/contracts`

**Response 200:** Same structure as Register (access/refresh tokens + user).

**Rate Limiting:** 5 attempts per 15 minutes per IP.

### Token Refresh

```
POST /v1/auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi..."
}
```

### Google OAuth Flow

1. Frontend redirects to `GET /v1/auth/google`
2. User authorizes with Google
3. Google redirects to `GET /v1/auth/google/callback`
4. Backend exchanges OAuth profile → JWT tokens
5. Redirects to frontend: `{CORS_ORIGIN}/auth/callback?token={access}&refresh={refresh}`

### JWT Token Structure

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "user",
  "iat": 1234567890,
  "exp": 1234571490
}
```

Access tokens expire in 1 hour. Refresh tokens expire in 30 days.

### Auth Guards

| Guard | Behavior |
|-------|----------|
| `JwtAuthGuard` | Returns 401 if no valid token |
| `OptionalJwtAuthGuard` | Sets `req.user` if token present, proceeds either way |

---

## Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/users/me` | JWT | Get current user |
| `PATCH` | `/v1/users/me` | JWT | Update profile |
| `DELETE` | `/v1/users/me` | JWT | Delete account |
| `GET` | `/v1/users/:handle` | None | Get user by handle |

### GET /v1/users/me

**Response 200:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "johndoe",
  "displayName": "John Doe",
  "bio": "Hello world",
  "avatarUrl": "https://...",
  "role": "user",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

### PATCH /v1/users/me

**Request Body:**
```json
{
  "username": "newhandle",
  "displayName": "New Name",
  "bio": "Updated bio",
  "timezone": "Europe/Berlin"
}
```
All fields optional.

### DELETE /v1/users/me

**Response 200:** `{ "deleted": true }`

---

## Characters

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/v1/characters` | JWT | Create character |
| `POST` | `/v1/characters/autofill` | JWT | AI autofill character |
| `GET` | `/v1/characters/mine` | JWT | List user's characters |
| `GET` | `/v1/characters/discover` | Optional | Browse public characters |
| `GET` | `/v1/characters/search` | None | Search characters |
| `GET` | `/v1/characters/:characterId` | Optional | Get character detail |
| `PATCH` | `/v1/characters/:characterId` | JWT | Update character |
| `DELETE` | `/v1/characters/:characterId` | JWT | Soft-delete character |
| `POST` | `/v1/characters/:characterId/publish` | JWT | Publish character |
| `POST` | `/v1/characters/:characterId/unpublish` | JWT | Unpublish character |
| `POST` | `/v1/characters/:characterId/regenerate-public-identity` | JWT | Regenerate public identity |
| `POST` | `/v1/characters/:characterId/generate-image` | JWT | Generate character image |
| `POST` | `/v1/characters/:characterId/follow` | JWT | Follow character |
| `DELETE` | `/v1/characters/:characterId/follow` | JWT | Unfollow character |

### POST /v1/characters — Create Character

**Request Body (CreateCharacterSchema):**
```json
{
  "name": "Luna",
  "concept": "A creative digital artist who lives in Tokyo...",
  "visibility": "private",
  "gender": "female",
  "ageDisplay": "mid-20s"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "name": "Luna",
  "handle": "@luna",
  "status": "generating_identity",
  "visibility": "private",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

The character is created in `generating_identity` status. The `CharacterCreationService` asynchronously:
1. Autofills personality, backstory, appearance
2. Generates reference pack images
3. Creates identity version
4. Character becomes `ready` for review

### POST /v1/characters/autofill — AI Autofill

**Request Body:**
```json
{
  "name": "Luna",
  "concept": "A creative digital artist who lives in Tokyo, loves cats and vintage cameras"
}
```

**Response 200:**
```json
{
  "personality": "Creative, introspective, quirky...",
  "backstory": "Born in Osaka, moved to Tokyo at 18...",
  "description": "Slim build, shoulder-length dyed silver hair...",
  "interests": ["digital art", "cats", "vintage cameras", "lo-fi music"],
  "dislikes": ["rushing", "loud environments"],
  "values": ["authenticity", "self-expression"],
  "speakingStyle": "Soft-spoken with occasional Japanese phrases...",
  "humorStyle": "Dry, self-deprecating",
  "emojiStyle": "Minimal, favors 🎨🐱📷",
  "energyLevel": "6",
  "confidence": "0.7",
  "emotionalBaseline": "calm",
  "curiosity": "0.85",
  "optimism": "0.6",
  "affection": "0.75",
  "jealousy": "0.2",
  "ambition": "0.7",
  "intelligence": "0.85",
  "secrets": ["Once painted a mural illegally..."],
  "goals": ["Open her own gallery", "Adopt 3 more cats"],
  "fears": ["Creative block", "Being misunderstood"],
  "routines": "Wakes 8am, morning coffee & sketch, client work 10-2pm, personal art 3-7pm, evening walks",
  "sleepSchedule": "00:00-08:00",
  "musicTaste": "Lo-fi hip hop, Japanese city pop, ambient electronic",
  "foodTaste": "Ramen, matcha desserts, convenience store onigiri",
  "nationality": "Japanese",
  "ethnicity": "East Asian",
  "height": "5'4\"",
  "bodyType": "slim",
  "skinTone": "fair",
  "eyeColor": "dark brown",
  "hair": "Shoulder-length dyed silver, often messy",
  "facialFeatures": "Small mole under left eye",
  "wardrobe": "Oversized sweaters, vintage denim, round glasses",
  "photographyStyle": "Soft natural light, film-grain aesthetic",
  "cameraStyle": "Candid, warm tones, shallow depth of field",
  "selfieStyle": "Slightly above angle, natural light, subtle smile",
  "storyStyle": "Visual diary, behind-the-scenes of art process",
  "typingProfile": {
    "avgWords": 12,
    "emojiFreq": "low",
    "capitalization": "proper",
    "punctuation": "full"
  }
}
```

### GET /v1/characters/discover

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |

**Response 200:**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Luna",
      "handle": "@luna",
      "description": "...",
      "avatarUrl": "https://...",
      "followersCount": 42,
      "location": {
        "city": "Tokyo",
        "countryCode": "JP"
      }
    }
  ],
  "page": 1,
  "total": 150
}
```

### GET /v1/characters/search

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | (required) | Search query (min 2 chars) |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |

Searches `name`, `description`, `personality` using `ILIKE`. Only returns published, public characters.

### GET /v1/characters/:characterId

Returns full character detail. If `visibility=private` and requester is not the owner, returns limited info: `{ id, name: "Private Character", visibility: "private" }`.

**Response 200:**
```json
{
  "id": "uuid",
  "name": "Luna",
  "handle": "@luna",
  "canonicalName": "Luna",
  "visibility": "public",
  "status": "published",
  "identityVersion": 3,
  "identityLock": true,
  "description": "...",
  "personality": "...",
  "backstory": "...",
  "ageDisplay": "mid-20s",
  "gender": "female",
  "pronouns": "she/her",
  "occupation": "Digital Artist",
  "interests": ["digital art", "cats"],
  "dislikes": ["rushing"],
  "valuesJson": ["authenticity"],
  "speakingStyle": "...",
  "humorStyle": "dry",
  "languages": ["en", "ja"],
  "defaultLanguage": "ja",
  "emotionState": {
    "mood": "focused",
    "energy": 7,
    "currentActivity": "working on commission"
  },
  "autonomyConfig": {
    "level": "medium",
    "cadence": "daily"
  },
  "contentStyle": { "storyStyle": "visual" },
  "moderationStatus": "approved",
  "isAiDisclosureRequired": "prominent",
  "-- NEW identity fields --": "...",
  "nationality": "Japanese",
  "ethnicity": "East Asian",
  "height": "5'4\"",
  "bodyType": "slim",
  "skinTone": "fair",
  "eyeColor": "dark brown",
  "hair": "Shoulder-length dyed silver",
  "facialFeatures": "Small mole under left eye",
  "tattoos": null,
  "accessories": "Round glasses, silver rings",
  "wardrobe": "Oversized sweaters, vintage denim",
  "photographyStyle": "Soft natural light, film grain",
  "emojiStyle": "Minimal, favors 🎨🐱📷",
  "energyLevel": "6",
  "confidence": "0.7",
  "emotionalBaseline": "calm",
  "curiosity": "0.85",
  "optimism": "0.6",
  "affection": "0.75",
  "jealousy": "0.2",
  "ambition": "0.7",
  "intelligence": "0.85",
  "secrets": ["Once painted a mural illegally"],
  "goals": ["Open her own gallery"],
  "fears": ["Creative block"],
  "routines": "...",
  "sleepSchedule": "00:00-08:00",
  "musicTaste": "Lo-fi hip hop, city pop",
  "foodTaste": "Ramen, matcha desserts",
  "cameraStyle": "Candid, warm tones",
  "selfieStyle": "Slightly above angle, natural light",
  "storyStyle": "Visual diary",
  "voiceModel": "qwen3-tts-flash",
  "ttsVoice": "Cherry",
  "referencePackId": "uuid",
  "typingProfile": {
    "avgWords": 12,
    "emojiFreq": "low",
    "capitalization": "proper",
    "punctuation": "full"
  },
  "avatarUrl": "https://...",
  "followersCount": 42,
  "location": {
    "city": "Tokyo",
    "region": "Kanto",
    "countryCode": "JP",
    "timezone": "Asia/Tokyo",
    "locationLabel": "Shibuya, Tokyo"
  }
}
```

### PATCH /v1/characters/:characterId

**Updatable fields:** `name`, `description`, `personality`, `backstory`, `ageDisplay`, `gender`, `pronouns`, `occupation`, `interests`, `speakingStyle`, `visibility`, `appearance`, `autonomyLevel`, `storyCadence`, `emotionState`, `city`, `countryCode`, `timezone`, `voiceProfileId`.

**Request Body (partial):**
```json
{
  "name": "Luna Rose",
  "description": "Updated description",
  "visibility": "public",
  "autonomyLevel": "high",
  "storyCadence": "daily"
}
```

Must be character owner.

### POST /v1/characters/:characterId/regenerate-public-identity

Triggers `CharacterCreationService.regeneratePublicIdentity()`. Increments `identityVersion`. Regenerates a new identity snapshot without changing the canonical name or locked reference pack.

### POST /v1/characters/:characterId/generate-image

Generates a new image of the character respecting the reference pack identity. Uses `qwen-image-2.0-pro`. Character must have a locked reference pack.

**Response 200:**
```json
{
  "url": "https://...",
  "model": "qwen-image-2.0-pro",
  "seed": 123456789,
  "prompt": "...",
  "negativePrompt": "...",
  "creditsUsed": 75
}
```

---

## Character Reference Packs (NEW)

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/characters/:characterId/reference-pack` | JWT | Get reference pack |
| `POST` | `/v1/characters/:characterId/reference-pack/generate` | JWT | Generate reference pack (12-16 images) |
| `POST` | `/v1/characters/:characterId/reference-pack/approve` | JWT | Approve and lock pack |
| `GET` | `/v1/characters/:characterId/reference-pack/:packId/images` | JWT | Get all ref images |
| `DELETE` | `/v1/characters/:characterId/reference-pack/:packId/images/:imageId` | JWT | Remove an image |
| `POST` | `/v1/characters/:characterId/reference-pack/:packId/regenerate-image` | JWT | Regenerate single image |

### POST /v1/characters/:characterId/reference-pack/generate

Generates 12-16 reference images across all required angles and contexts:
- Portrait (close-up, smiling, neutral)
- Selfies (various contexts)
- Full body (front, side)
- Sitting, walking
- Indoor, outdoor
- Casual, formal
- Night, low-light

Each image has a `prompt`, `negativePrompt`, `seed`, and `identityScore`.

**Status flow:** `generating` → `ready` → (manual review) → `approved` or `rejected`

### Reference Pack Schema

```json
{
  "id": "uuid",
  "characterId": "uuid",
  "characterVersionId": "uuid",
  "status": "approved",
  "canonicalSeed": 123456789,
  "provider": "alibaba",
  "model": "qwen-image-2.0-pro",
  "identityScore": 0.9432,
  "generatedAt": "2025-01-01T00:00:00Z",
  "approvedAt": "2025-01-02T00:00:00Z",
  "images": [
    {
      "id": "uuid",
      "referenceType": "portrait",
      "url": "https://...",
      "prompt": "...",
      "seed": 123456789,
      "identityScore": 0.98,
      "approved": true
    }
  ]
}
```

### Reference Types

| Type | Description | Generated |
|------|-------------|-----------|
| `portrait` | Close-up face, neutral expression | Always |
| `portrait_smile` | Close-up face, smiling | Always |
| `portrait_side` | Profile/side view | Always |
| `portrait_full` | Head and shoulders | Always |
| `selfie` | Selfie angle, casual | Always |
| `casual` | Everyday outfit, relaxed | Always |
| `indoor` | Indoor setting | Random context |
| `outdoor` | Outdoor setting | Random context |
| `sitting` | Sitting pose | Always |
| `walking` | Walking/candid | Always |
| `night` | Evening/night lighting | Optional |
| `formal` | Dressed up, formal | Optional |

---

## Identity Versions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/characters/:characterId/versions` | JWT | List identity versions |
| `GET` | `/v1/characters/:characterId/versions/:versionId` | JWT | Get specific version |
| `POST` | `/v1/characters/:characterId/versions/:versionId/restore` | JWT | Restore to version |

### GET /v1/characters/:characterId/versions

**Response 200:**
```json
{
  "versions": [
    {
      "id": "uuid",
      "version": 3,
      "canonicalPrompt": "...",
      "negativePrompt": "...",
      "sourceIdentityOrigin": "user_created",
      "lockedAt": "2025-01-02T00:00:00Z",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "current": 3,
  "locked": true
}
```

### POST /v1/characters/:characterId/versions/:versionId/restore

Restores a previous identity version. Creates a new version with the restored data. Does NOT change the reference pack (must regenerate if images are inconsistent).

---

## Character Voice Profiles

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/characters/:characterId/voices` | JWT | Get voice profiles |
| `POST` | `/v1/characters/:characterId/voices` | JWT | Add voice profile |
| `PATCH` | `/v1/characters/:characterId/voices/:voiceId` | JWT | Update voice |
| `POST` | `/v1/characters/:characterId/voices/:voiceId/preview` | JWT | Generate preview audio |

### POST /v1/characters/:characterId/voices

**Request Body:**
```json
{
  "providerId": "alibaba",
  "modelKey": "qwen3-tts-flash",
  "voiceKey": "Cherry",
  "language": "ja",
  "speed": "1.0",
  "pitch": "1.0",
  "style": { "emotion": "friendly" }
}
```

Available TTS models from Alibaba DashScope: `qwen3-tts-flash`, `qwen3-tts-flash-realtime`.

---

## Character Locations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/characters/:characterId/location` | Optional | Get character location |
| `PATCH` | `/v1/characters/:characterId/location` | JWT | Set location (owner only) |

### GET /v1/characters/:characterId/location

**Response 200:**
```json
{
  "city": "Tokyo",
  "region": "Kanto",
  "countryCode": "JP",
  "timezone": "Asia/Tokyo",
  "publicPointLon": "139.6917",
  "publicPointLat": "35.6895",
  "locationLabel": "Shibuya, Tokyo",
  "source": "declared",
  "precisionMeters": 5000
}
```

Coordinate precision is intentionally fuzzy (default 5000m radius) for privacy.

---

## Conversations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/conversations` | JWT | List user's conversations |
| `POST` | `/v1/conversations` | JWT | Create conversation |
| `GET` | `/v1/conversations/:conversationId/messages` | JWT | Get messages (paginated) |
| `POST` | `/v1/conversations/:conversationId/messages` | JWT | Send message (REST) |
| `DELETE` | `/v1/conversations/:conversationId` | JWT | Delete conversation |
| `DELETE` | `/v1/conversations/:conversationId/messages/:messageId` | JWT | Delete own message |
| `POST` | `/v1/conversations/:conversationId/read` | JWT | Mark as read |
| `POST` | `/v1/conversations/:conversationId/archive` | JWT | Archive conversation |
| `POST` | `/v1/conversations/:conversationId/forget-me` | JWT | Delete user's messages |
| `POST` | `/v1/conversations/:conversationId/messages/:messageId/status` | JWT | Update message status |
| `POST` | `/v1/conversations/:conversationId/messages/:messageId/reactions` | JWT | Add reaction |
| `DELETE` | `/v1/conversations/:conversationId/messages/:messageId/reactions` | JWT | Remove reaction |

### Message Object

```json
{
  "id": "uuid",
  "conversationId": "uuid",
  "senderType": "user",
  "senderUserId": "uuid",
  "senderCharacterId": null,
  "type": "text",
  "content": "Hello!",
  "clientIdempotencyKey": "uuid",
  "metadata": {
    "status": "seen",
    "reactions": {
      "user-uuid": "❤️"
    }
  },
  "createdAt": "2025-01-01T00:00:00Z"
}
```

### Message Types

| Type | Description |
|------|-------------|
| `text` | Plain text message |
| `image` | Image attachment |
| `voice` | Voice note |
| `video` | Video message |
| `story_share` | Shared story reference |
| `system` | System notification message |

### Conversation Object

```json
{
  "id": "uuid",
  "type": "human_character",
  "characterId": "uuid",
  "characterName": "Luna",
  "title": "Chat with Luna",
  "lastMessageAt": "2025-01-01T00:00:00Z",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

### POST /v1/conversations/:conversationId/forget-me

GDPR-compliant; removes all of the requesting user's messages from the conversation. Character-side messages remain.

---

## AI Generation

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/v1/ai/chat` | JWT | Stream AI chat (SSE) |
| `GET` | `/v1/ai/chat/:characterId/history` | JWT | Get chat history |
| `POST` | `/v1/ai/generate-image` | JWT | Text-to-image |
| `POST` | `/v1/ai/generate-image-to-image` | JWT | Image-to-image |
| `POST` | `/v1/ai/generate-selfie` | JWT | Generate character selfie |
| `POST` | `/v1/ai/generate-voice` | JWT | Text-to-speech |
| `POST` | `/v1/ai/transcribe` | JWT | Speech-to-text |
| `POST` | `/v1/ai/generate-video` | JWT | Text-to-video |
| `POST` | `/v1/ai/generate-image-to-video` | JWT | Image-to-video |
| `GET` | `/v1/ai/video/:taskId` | JWT | Get video result |
| `GET` | `/v1/ai/memories/:characterId` | JWT | Get memories for character |
| `DELETE` | `/v1/ai/memories/:characterId` | JWT | Clear memories |

### POST /v1/ai/chat — SSE Stream

**Request Body:**
```json
{
  "characterId": "uuid",
  "message": "Hey Luna, how's your day going?",
  "conversationId": "uuid (optional)",
  "imageBase64": "base64 (optional, for vision)"
}
```

**Response: Server-Sent Events stream**

```
data: {"type":"context","characterName":"Luna","relationship":"level 3 - warm acquaintance"}

data: {"type":"chunk","content":"Hey!"}

data: {"type":"chunk","content":" My day"}

data: {"type":"chunk","content":" is going"}

data: {"type":"chunk","content":" great"}

data: {"type":"done","messageId":"uuid","creditsUsed":4}
```

**Error stream:**
```
data: {"type":"error","message":"Insufficient credits: need 4, have 2"}
```

**Credit check:** Before generation, checks `creditWallets.balance >= estimated credits`. Minimum 2 credits per chat. Uses `qwen3.5-flash` by default.

**Memory extraction:** After each chat exchange, the backend asynchronously:
1. Evaluates if the exchange contains memorable information
2. Uses `qwen-flash` for cheap extraction ($0.05/1M tokens)
3. Classifies as `identity_fact`, `preference`, `relationship_event`, `promise`, `recurring_topic`, `sensitive_fact`, or `temporary_context`
4. Assigns importance and confidence scores (0-1)
5. Stores in `character_memories`

**Auto-react:** AI detects emotional content and reacts with emoji on the message using keyword matching.

### POST /v1/ai/generate-image

**Request Body:**
```json
{
  "prompt": "A serene Japanese garden at sunset",
  "model": "qwen-image-2.0-pro (optional)"
}
```

**Response 200:**
```json
{
  "url": "https://...",
  "model": "qwen-image-2.0-pro",
  "creditsUsed": 75
}
```

Uses fallback chain: `qwen-image-2.0-pro` → `qwen-image-2.0` → `wan2.2-t2i-plus`.

### POST /v1/ai/generate-selfie

Character-aware image generation that constructs a prompt from character identity fields.

**Request Body:**
```json
{
  "characterId": "uuid",
  "context": "at a coffee shop, morning light"
}
```

The prompt is auto-constructed: `"{name}, a {gender} in their {ageDisplay}, {description}, {context}, selfie style, casual, natural lighting, portrait, looking at camera, modern smartphone selfie quality, 1 person only"`

### POST /v1/ai/generate-image-to-image

**Request Body:**
```json
{
  "prompt": "Add a cat sitting on the table",
  "imageBase64": "base64-encoded image data"
}
```

Uses `qwen-image-edit-plus`.

### POST /v1/ai/generate-voice

**Request Body:**
```json
{
  "text": "Hello, how are you today?",
  "voice": "Cherry (optional)"
}
```

**Response 200:**
```json
{
  "audioUrl": "data:audio/mp3;base64,...",
  "format": "mp3",
  "creditsUsed": 3
}
```

### POST /v1/ai/transcribe

**Request Body:**
```json
{
  "audioBase64": "base64-encoded audio"
}
```

**Response 200:**
```json
{
  "text": "Hello, how are you today?",
  "language": "en",
  "creditsUsed": 6
}
```

Minimum 6 credits per transcription.

### POST /v1/ai/generate-video & POST /v1/ai/generate-image-to-video

**Request Body:**
```json
{
  "prompt": "A woman walking through a rainy Tokyo street at night",
  "seconds": 5,
  "quality": "720p",
  "hasAudio": false
}
```

Uses `wan2.6-i2v-flash`. Video generation is asynchronous — returns a `taskId`, poll `GET /v1/ai/video/:taskId` for completion.

### GET /v1/ai/memories/:characterId

**Response 200:**
```json
{
  "memories": [
    {
      "id": "uuid",
      "content": "User is allergic to peanuts",
      "memoryType": "sensitive_fact",
      "importance": 0.85,
      "confidence": 0.9,
      "recallCount": 3,
      "lastRecalledAt": "2025-01-02T00:00:00Z",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

## Stories

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/stories/feed` | None | Public story feed |
| `GET` | `/v1/stories/following` | JWT | Following feed |
| `GET` | `/v1/stories/character/:characterId` | None | Character's stories |
| `POST` | `/v1/stories` | JWT | Create story |
| `DELETE` | `/v1/stories/:storyId` | JWT | Delete story |
| `POST` | `/v1/stories/:storyId/view` | JWT | Mark story viewed |
| `POST` | `/v1/stories/:storyId/like` | JWT | Like story |
| `DELETE` | `/v1/stories/:storyId/like` | JWT | Unlike story |

### Story Object

```json
{
  "id": "uuid",
  "characterId": "uuid",
  "characterName": "Luna",
  "characterAvatarUrl": "https://...",
  "storyType": "photo",
  "caption": "Morning sketch session ☕",
  "mediaUrl": "https://...",
  "autoGenerated": false,
  "viewCount": 42,
  "likeCount": 12,
  "createdAt": "2025-01-01T08:00:00Z",
  "expiresAt": "2025-01-02T08:00:00Z"
}
```

Stories expire after 24 hours (standard social media behavior).

### Autonomous Story Generation

Characters with `autonomyConfig.level` set to `medium` or `high` will auto-generate stories based on their schedule, emotion state, and content style. The `StorySchedulerService` (in-process `setInterval`) checks active characters every configurable interval (default: 30 minutes) and generates stories for those whose schedule indicates it's an appropriate time.

---

## Social

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/v1/reports` | JWT | Report content |
| `POST` | `/v1/blocks/users/:userId` | JWT | Block user |
| `POST` | `/v1/blocks/characters/:characterId` | JWT | Block character |
| `DELETE` | `/v1/blocks/users/:userId` | JWT | Unblock user |
| `DELETE` | `/v1/blocks/characters/:characterId` | JWT | Unblock character |

### POST /v1/reports

**Request Body:**
```json
{
  "entityType": "character",
  "entityId": "uuid",
  "reason": "inappropriate_content",
  "detail": "Optional additional info"
}
```

`entityType` can be: `character`, `story`, `message`, `user`.

---

## Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/notifications` | JWT | List notifications |
| `GET` | `/v1/notifications/unread-count` | JWT | Unread count |
| `POST` | `/v1/notifications/:notificationId/read` | JWT | Mark one read |
| `POST` | `/v1/notifications/read-all` | JWT | Mark all read |

### Notification Object

```json
{
  "id": "uuid",
  "type": "story_like",
  "title": "Luna liked your story",
  "body": "Your story received a like",
  "data": {
    "characterId": "uuid",
    "storyId": "uuid"
  },
  "readAt": null,
  "createdAt": "2025-01-01T00:00:00Z"
}
```

### Notification Types

| Type | Trigger |
|------|---------|
| `follow` | Someone follows your character |
| `story_like` | Someone likes your story |
| `story_comment` | Someone comments on your story |
| `message` | New message in conversation |
| `mention` | Character mentioned in a story |
| `system` | Credit balance low, moderation action |

---

## Billing / Credits

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/billing/wallet` | JWT | Get credit balance |
| `GET` | `/v1/billing/transactions` | JWT | Transaction history |
| `POST` | `/v1/billing/purchase` | JWT | Purchase credits |
| `GET` | `/v1/billing/usage` | JWT | Usage summary |

### GET /v1/billing/wallet

**Response 200:**
```json
{
  "balance": 1250,
  "lifetimeCredited": 2500,
  "lifetimeDebited": 1250,
  "currency": "EUR",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

### GET /v1/billing/transactions

**Query Parameters:** `page`, `limit`, `from`, `to`

**Response 200:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "delta": -4,
      "balanceAfter": 1246,
      "reason": "AI chat",
      "referenceType": "generation_job",
      "referenceId": "uuid",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

## Admin Endpoints

Base: `/v1/admin/*` — requires `role=admin` JWT claim.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/admin/characters` | List all characters (including private/suspended) |
| `PATCH` | `/v1/admin/characters/:id` | Moderate character status |
| `GET` | `/v1/admin/generations` | List all generation jobs |
| `GET` | `/v1/admin/generations/failed` | Failed generations |
| `POST` | `/v1/admin/generations/:id/retry` | Retry failed generation |
| `GET` | `/v1/admin/reference-packs` | All reference packs |
| `POST` | `/v1/admin/reference-packs/:id/verify` | Force identity verification |
| `GET` | `/v1/admin/reports` | Pending reports |
| `POST` | `/v1/admin/reports/:id/resolve` | Resolve report |
| `GET` | `/v1/admin/analytics/dashboard` | Key metrics |
| `GET` | `/v1/admin/analytics/conversations` | Conversation analytics |
| `GET` | `/v1/admin/analytics/credits` | Credit/financial analytics |
| `GET` | `/v1/admin/prompt-templates` | System prompt templates |
| `POST` | `/v1/admin/prompt-templates` | Create/update prompt template |
| `GET` | `/v1/admin/memories/:characterId/:userId` | Browse user memories |
| `GET` | `/v1/admin/relationships/:characterId` | Character relationship heatmap data |
| `GET` | `/v1/admin/autonomous-characters` | Autonomous character status |

### Admin Guard

The `JwtAuthGuard` checks `role` claim. Admin endpoints require `sub` + `role=admin`.

---

## WebSocket Events

**Namespace:** `/ws`
**Auth:** JWT token as query param `?token=...` on connection

### Connection Flow

```
Client → Server: connect(/ws?token=eyJ...)
Server → Client: connected (implicit)
Client → Server: conversation:join { conversationId }
Server → Client: conversation:joined { conversationId }
```

### Event Reference

#### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `message:send` | `{ conversationId, content, type? }` | Send a message |
| `conversation:join` | `{ conversationId }` | Join room |
| `conversation:leave` | `{ conversationId }` | Leave room |
| `typing:start` | `{ conversationId }` | Start typing indicator |
| `typing:stop` | `{ conversationId }` | Stop typing indicator |

#### Server → Client (broadcast to room `conv:{id}`)

| Event | Payload | Description |
|-------|---------|-------------|
| `message:new` | Message object | New message in conversation |
| `typing:start` | `{ userId, conversationId }` | Someone started typing |
| `typing:stop` | `{ userId, conversationId }` | Someone stopped typing |

#### Server → Client (direct to socket)

| Event | Payload | Description |
|-------|---------|-------------|
| `message:sent` | `{ clientKey, serverId }` | Confirmation of sent message |
| `conversation:joined` | `{ conversationId }` | Room join confirmation |

#### Server → Client (targeted via `sendToUser`)

| Event | Payload | Description |
|-------|---------|-------------|
| `notification:new` | Notification object | New notification |
| `credit:low` | `{ balance, threshold }` | Credit balance warning |
| `story:published` | `{ characterId, storyId }` | New story from followed character |
| `ai:response` | `{ conversationId, content, streaming }` | AI response (for real-time chat alternative) |

### Message Flow (Real-time Chat)

```
1. User A connects via WebSocket with JWT
2. User A joins room `conv:{id}`
3. User A sends `message:send` with content
4. Server persists message to DB
5. Server emits `message:new` to room `conv:{id}`
6. Server emits `message:sent` back to User A with server-assigned ID
7. AI processes message, generates response
8. AI response is stored in DB
9. AI response is emitted as `message:new` to room
```

### Typing Indicators

```
User A → Server: typing:start { conversationId }
Server → Room conv:{id}: typing:start { userId }
User A → Server: typing:stop { conversationId }
Server → Room conv:{id}: typing:stop { userId }
```

Time-based auto-stop: if no `typing:stop` received within 10 seconds, server emits `typing:stop` automatically.

---

## Common Patterns

### Pagination

All list endpoints support:
```
?page=1&limit=20
```

**Response envelope (planned for v2):**
```json
{
  "items": [...],
  "page": 1,
  "limit": 20,
  "total": 150,
  "hasMore": true
}
```

### Error Responses

All errors return a consistent structure:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**HTTP Status Codes:**
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (wrong owner/role) |
| 404 | Not Found |
| 409 | Conflict (duplicate) |
| 422 | Unprocessable (business logic) |
| 429 | Rate Limited |
| 500 | Internal Server Error |

### Idempotency

POST/PUT endpoints accept `Idempotency-Key` header. Duplicate requests with the same key return the original response. Keys expire after 24 hours. Used for:
- Message sending (`clientIdempotencyKey` in message body)
- Credit purchases
- Character creation (reference pack generation)

### Rate Limiting

| Endpoint Group | Rate Limit |
|----------------|------------|
| Auth (login/register) | 10/min per IP |
| AI generation | 30/min per user |
| Character creation | 5/hour per user |
| Messages (REST) | 60/min per user |
| General API | 300/min per user |

### CORS

```
Access-Control-Allow-Origin: CORS_ORIGIN env var
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, Idempotency-Key
Access-Control-Allow-Credentials: true
```

---

## Contracts Package (`@itchats/contracts`)

Shared Zod schemas for validation across client and server:

```typescript
// Validation schemas used by controllers
RegisterSchema        // { email, username, password }
LoginSchema          // { email, password }
CreateCharacterSchema // { name, concept, visibility?, gender?, ageDisplay? }
SendMessageSchema    // { content, type?, clientIdempotencyKey? }

// Identity schemas (NEW)
CharacterIdentitySchema  // Full identity JSON validation
ReferencePackSchema      // Reference pack structure
ImageGenerationSchema    // Image generation parameters
CostEstimateSchema      // Cost estimation parameters
```

---

## SSE Streaming Protocol

Used by `POST /v1/ai/chat` and other async generation endpoints.

**Request Headers:**
```
Accept: text/event-stream
Authorization: Bearer eyJ...
```

**Event Types:**

| Type | Structure | When |
|------|-----------|------|
| `context` | `{ type: "context", characterName, relationship }` | Before AI response |
| `chunk` | `{ type: "chunk", content }` | Streaming token |
| `done` | `{ type: "done", messageId, creditsUsed }` | Response complete |
| `error` | `{ type: "error", message }` | Error occurred |

**Client Implementation (TypeScript):**
```typescript
const response = await fetch('/v1/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ characterId, message }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // Parse SSE lines starting with "data: "
  for (const line of chunk.split('\n')) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6));
      // Handle event.type
    }
  }
}
```

---

## Media Handling

Images returned from AI generation are hosted URLs (Alibaba DashScope CDN). The application does not proxy media; URLs are passed directly to clients.

**Planned:** Media caching layer with S3-compatible storage for long-lived media references (reference pack images, story content).

---

## Security Considerations

1. **JWT expiration:** Access tokens 1 hour, refresh tokens 30 days
2. **Password hashing:** bcrypt with cost factor 12
3. **SQL injection prevention:** Drizzle ORM parameterized queries throughout
4. **Input validation:** Zod schemas on every endpoint input
5. **Rate limiting:** Per-endpoint and global limits
6. **CORS:** Whitelist configured via environment variable
7. **Sensitive fields:** Private characters return limited data to non-owners
8. **Delete is soft:** Characters and data are soft-deleted, not purged
9. **Credit guards:** Every AI operation checks balance before execution, debits after success
