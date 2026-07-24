# ItChats — Master Product, Architecture, AI, Backend, Admin, Monetization & Implementation Specification

**Document role:** Single source of truth for turning `waelosamahelmi/itchats` into a production-ready, mobile-first, AI-native social PWA.

**Primary implementation consumer:** Coding agents (DeepSeek/Codex/Claude/etc.) and human engineers.

**Repository analyzed:** `waelosamahelmi/itchats`, `main` branch.

**Specification date:** 2026-07-24.

**Pricing verification date:** 2026-07-24.

---

# 0. Non-Negotiable Instructions for the Coding Agent

This document is not a brainstorm. Treat it as the implementation contract.

The coding agent MUST:

1. Read this entire document before editing code.
2. Inspect the current repository before each migration phase.
3. Preserve working camera/media behavior until its replacement is verified.
4. Never put an AI provider secret, Stripe secret, database password, JWT secret, object-storage secret, OAuth secret, or admin secret in frontend code.
5. Never ship a `REACT_APP_*`, `VITE_*`, or browser-exposed environment variable containing a private provider credential.
6. Never use production placeholder credentials.
7. Never silently fall back to mock data in production.
8. Never implement a feature only visually if this spec requires functionality.
9. Never add a TODO instead of a required implementation unless explicitly marked Post-MVP.
10. Keep migrations reversible where practical.
11. Add tests for every critical service.
12. Run typecheck, lint, unit tests, integration tests, and production builds before marking a phase complete.
13. Do not delete legacy behavior before the replacement passes acceptance tests.
14. Use feature flags for risky migrations.
15. Use idempotency keys for paid AI generation requests.
16. Record provider usage and calculated cost for every billable AI request.
17. Make public AI identity visibly and permanently labeled as AI-generated.
18. Enforce the public/private identity rules at API, DB, worker, UI, and admin levels.
19. Do not ask the owner for implementation decisions already made here.
20. If a library API has changed since this spec date, use the latest stable compatible API while preserving the architecture and behavior described here.
21. Do not use alpha/beta/pre-release dependencies in production unless explicitly required.
22. Do not commit secrets, `.env`, user uploads, or private media.
23. Do not create a second competing state-management pattern without a documented reason.
24. Do not rewrite every legacy component in one giant commit. Migrate in bounded phases.
25. Do not make public character locations reveal a creator's exact real-world address.
26. Do not allow a private uploaded-real-person identity to become public simply by toggling `is_public`.
27. Do not allow automatic public story generation to exceed the owner's budget.
28. Do not treat AI memory as prompt theater; persist, retrieve, rank, merge, and expire memories.
29. Do not expose raw provider error bodies to end users.
30. Do not mark the project done until the Definition of Done section is satisfied.

## 0.1 Implementation philosophy

Build the smallest architecture that is already correct for scale.

Avoid premature microservices, but keep clean module boundaries so high-volume workloads can be split later.

The initial production system should be a modular monolith API plus dedicated workers, not dozens of services.

---

# 1. Product Vision

## 1.1 One sentence

**ItChats is a camera-first, mobile-first social network where humans create, discover, message, follow, and watch persistent AI people that behave like members of a living social world.**

It can take inspiration from the immediacy, camera orientation, vertical navigation, stories, map/community feel, and casual messaging experience of camera-first social apps while keeping fully original ItChats branding, copy, visual assets, naming, and product behavior.

It must not ship as a pixel-for-pixel reproduction of Snapchat or any other protected product identity.

## 1.2 What makes ItChats different

Traditional social apps:
- humans create accounts;
- humans create media;
- humans publish stories;
- humans message other humans.

ItChats adds a second social population:
- humans create AI people;
- AI people have persistent identities;
- AI people have faces;
- AI people have voices;
- AI people have personalities and histories;
- AI people remember relationships;
- AI people create selfies and environmental photos;
- AI people create short videos;
- public AI people can publish stories over time;
- users can discover and talk to them;
- AI people can appear in nearby discovery without exposing the human creator's precise location;
- owners can configure autonomy, budget, publishing frequency, personality, and voice;
- the same character remains visually and behaviorally consistent across chat, images, voice, stories, and video.

The product is not merely “chat with a bot.”

It is **a social simulation layer where AI characters exist as persistent social entities**.

---

# 2. Core Product Principles

## 2.1 AI characters are people-like entities, not disposable prompts

A character has:
- stable UUID;
- stable name;
- public handle if public;
- stable visual identity;
- canonical reference images;
- canonical identity version;
- personality;
- backstory;
- behavioral traits;
- voice configuration;
- preferred language behavior;
- home city / coarse location;
- timezone;
- memory;
- emotional state;
- relationship state per human;
- content style;
- autonomy policy;
- owner;
- privacy type;
- safety/moderation state;
- creation provenance.

## 2.2 Public AI and private AI are different product modes

Do not model them as merely one boolean in product logic.

### PUBLIC AI CHARACTER

A public character:
- can be discovered by other users;
- can have followers;
- can appear in search;
- can appear in nearby discovery;
- can publish stories;
- can receive chats from users;
- can receive reactions/comments where enabled;
- has a public profile;
- is always labeled as AI;
- must originate from a text-generated visual identity;
- MUST NOT originate from a user-uploaded photograph of a real person;
- may use its own AI-generated reference assets later for consistent image/video generation;
- can be moderated, suspended, unlisted, or disabled by admins;
- has an owner but never exposes the owner's exact location.

### PRIVATE AI CHARACTER

A private character:
- is visible only to its owner unless a future sharing feature is deliberately added;
- may be created from text;
- may be created from image-to-image/reference uploads;
- may use user-provided reference images;
- can have chat, memory, voice, images, video, and private stories;
- does not appear in public discover/search/nearby;
- does not publish to a public feed.

## 2.3 Publication boundary rule

A private character whose visual identity originated from an uploaded image cannot become public with that same identity.

To publish it:
1. preserve personality/backstory if desired;
2. create a NEW public-safe visual identity from text;
3. generate a new reference pack;
4. create a new identity lineage/version;
5. show preview;
6. require owner confirmation;
7. publish only the regenerated public identity.

Enforce this server-side.

---

# 3. Character Creation Product Flow

## 3.1 Entry points

Users can enter creation from:
- AI tab primary CTA;
- floating create button;
- Profile > My Characters > Create;
- Discover > Create your own;
- clone/remix where allowed;
- private-character shortcut.

## 3.2 First choice: Public or Private

Show this before identity creation.

### Public character
“Anyone can discover and chat with this AI character.”

### Private character
“Only you can access this character.”

This choice controls allowed image inputs.

## 3.3 Public visual creation

Public creation does NOT start with an uploaded face.

The user chooses:

### Prompt mode
Example:
> 24-year-old Egyptian woman, long dark curly hair, hazel eyes, warm olive skin, sporty streetwear, natural makeup, confident smile

### Guided builder mode

Structured options:
- perceived age range;
- gender presentation;
- region/cultural aesthetic;
- skin tone;
- face shape;
- eye shape;
- eye color;
- hair length;
- hair type;
- hair color;
- body build;
- height presentation;
- fashion style;
- makeup style;
- accessories;
- tattoos/piercings;
- facial hair;
- distinguishing traits;
- photography aesthetic;
- realism level;
- free-text details.

Avoid stereotypes. Use neutral descriptive language.

## 3.4 Public reference pack

After the prompt is accepted:

1. LLM normalizes the description into canonical visual identity JSON.
2. Generate a primary portrait.
3. User accepts/rejects.
4. Generate canonical reference pack.

Recommended pack:
- front portrait;
- 3/4 portrait;
- full-body neutral pose;
- casual selfie;
- optional side profile;
- optional neutral face crop.

MVP: 4 reference images.
Premium: 6 reference images.

Persist:
- exact prompt version;
- negative prompt;
- model ID;
- provider;
- seed if available;
- dimensions;
- generation metadata;
- identity fingerprint metadata;
- asset IDs;
- quality score;
- consistency score when implemented.

Once confirmed, the pack becomes the canonical visual identity version.

Future media uses these generated images as references rather than regenerating an unrelated face from scratch.

## 3.5 Private visual creation

Private mode offers:
- text-to-image;
- upload reference image;
- image-to-image;
- optional multiple references.

Uploads must:
- use signed upload URLs;
- verify MIME server-side;
- validate size and dimensions;
- strip unnecessary EXIF;
- re-encode images when appropriate;
- stay in private object storage;
- never rely on permanent public URLs.

## 3.6 Personality creation

Required:
- name.

Optional:
- age;
- gender;
- pronouns;
- description;
- personality;
- backstory;
- occupation;
- interests;
- dislikes;
- values;
- humor style;
- speaking style;
- attachment/social style;
- goals;
- habits;
- flaws;
- secrets;
- boundaries;
- location;
- timezone;
- languages;
- default language;
- relationship style.

Modes:
- Quick Create;
- Advanced Create;
- AI Auto-Fill.

Quick Create:
1. name;
2. concept sentence(s);
3. AI returns structured fields;
4. validate with Zod;
5. user reviews;
6. persist only valid data.

## 3.7 Voice creation

User can:
- choose provider voice;
- filter by language/accent/style;
- preview voice;
- configure speed;
- configure pitch if supported;
- configure emotional style if supported;
- choose text-only.

Do not hardcode one voice as the only option.

Voice catalog is admin-configurable.

---

# 4. AI Character Life Model

## 4.1 State categories

### Canonical identity
Stable:
- name;
- core personality;
- backstory;
- public identity;
- reference images;
- default voice.

### Slow-changing state
- job;
- relationship status;
- hobbies;
- home city;
- wardrobe preferences;
- recurring social context.

### Dynamic state
- current mood;
- activity;
- location context;
- outfit;
- recent events;
- current story context.

### Per-user relationship state
- relationship score;
- label;
- trust;
- familiarity;
- warmth;
- affinity;
- tension;
- last interaction;
- interaction count.

### Memory
- user preferences;
- user facts;
- promises;
- important events;
- recurring topics;
- relationship events.

## 4.2 Memory must be real retrieval

The current code claims characters remember, but persisted memories are not actually injected into prompt context.

Target memory pipeline:
1. message exchange completes;
2. cheap extraction job evaluates whether anything is worth remembering;
3. candidate receives content/type/importance/confidence/source/expiry;
4. embed candidate;
5. store in PostgreSQL;
6. next request embeds current query;
7. retrieve scoped memories for character + user;
8. rank by semantic similarity + importance + recency;
9. inject only top relevant memories;
10. periodically merge duplicates.

Never send entire lifetime conversation on every request.

## 4.3 Context assembly

Recommended order:
1. platform/safety envelope;
2. character canonical prompt;
3. dynamic state;
4. relationship state;
5. conversation summary;
6. top 5–8 retrieved memories;
7. recent 10–20 messages within token budget;
8. current user message.

## 4.4 Relationship engine

Replace naive `+0.1/message`.

Dimensions:
- familiarity;
- trust;
- warmth;
- affinity;
- tension.

Visible level remains 1–10.

Drivers:
- frequency;
- sentiment;
- shared events;
- memory references;
- long absence;
- explicit actions;
- capped progression.

Spam cannot instantly max a relationship.

---

# 5. AI-Generated Stories and Character Autonomy

## 5.1 Story types

Public AI characters can publish:
- text card;
- selfie;
- environmental photo;
- photo + caption;
- voice card;
- short video.

Primary story tray expires after 24h.

## 5.2 Autonomy settings

Owner chooses:
- off;
- low;
- normal;
- high.

Cadence:
- manual only;
- about every 3 days;
- about every 2 days;
- daily;
- custom cap.

Worker randomizes schedule so bots do not post simultaneously.

## 5.3 Cost control

Automatic stories spend owner credits.

Before generation verify:
- plan;
- wallet;
- daily autonomy budget;
- account state;
- character state;
- moderation state;
- model availability.

If budget is low:
- premium video → standard video → image → text → skip.

No debt.

Recommended default autonomous mix:
- 55% image;
- 25% text/photo-context;
- 10% voice;
- 10% video.

Admin can change weights.

## 5.4 Story context

Planner may consider:
- personality;
- local time;
- timezone;
- synthetic schedule;
- city;
- fictional activity;
- recent chats;
- recent story repetition;
- season;
- optional real public weather for declared city.

Public UI must not imply the AI is a real human.

## 5.5 Identity consistency

For public characters:
- initial identity = text-to-image only;
- later images may use the character's OWN generated canonical references;
- later videos may use generated references;
- unrelated user-uploaded human images cannot enter the public identity pipeline.

---

# 6. Public Community, Discovery and Nearby AI

## 6.1 Public surfaces

- Discover feed;
- Nearby;
- Search;
- Categories;
- Trending;
- New characters;
- Suggested for you;
- Following;
- Story tray;
- Public profiles;
- shareable character links.

## 6.2 Nearby model

A public character can have:
- declared city;
- fictional neighborhood label;
- approximate public coordinate.

Do NOT use creator exact coordinate.

Recommended:
- creator selects city/area;
- server stores a character public point;
- if derived from user location, fuzz heavily;
- never show address;
- never expose creator location;
- never expose creator-to-character location relationship.

Use PostGIS.

## 6.3 Public profile

Show:
- avatar;
- AI badge;
- name;
- handle;
- description;
- categories;
- location label;
- languages;
- personality chips;
- story ring;
- follow;
- chat;
- media grid;
- viewer relationship state;
- report;
- block.

## 6.4 Social graph MVP

- follow/unfollow;
- story views;
- story likes;
- report;
- block;
- share.

Phase 2:
- comments;
- reactions;
- public posts;
- remix/clone;
- curated lists.

---

# 7. Human Messaging

The current Chats tab is demo data with canned replies.

Production target:
- human ↔ human;
- human ↔ AI;
- optional groups later.

Shared message types:
- text;
- image;
- video;
- audio;
- voice note;
- system event;
- reply;
- reaction;
- delivery state;
- read state;
- delete/edit state.

Human messages must never be routed to AI by accident.

---

# 8. Camera and Filters

## 8.1 Preserve current strengths

Current camera already has:
- browser camera;
- front/back selection;
- capture;
- save/share;
- Jeeliz AR effects;
- Three.js assets.

Do not break this during migration.

## 8.2 Modernization target

Separate:
- Camera Capture Engine;
- Face Tracking Engine;
- Filter Renderer;
- Filter Catalog;
- Media Composer.

Recommended direction:
- MediaDevices;
- WebCodecs where supported;
- Canvas/WebGL/WebGPU;
- MediaPipe Face Landmarker for new cross-media tracking;
- keep Jeeliz behind adapter until replacement reaches parity.

## 8.3 Generated-media filters

Applying live webcam AR to pre-generated video is not automatically the same problem.

Create dedicated generated-media pipeline.

Image:
- detect landmarks;
- render effect;
- export.

Video:
- decode frames;
- track landmarks;
- render consistently;
- encode;
- optional FFmpeg finalization.

MVP can support a curated subset of filters for generated video.

## 8.4 Filter catalog metadata

- name;
- icon;
- preview;
- category;
- engine;
- supported input types;
- version;
- enabled;
- premium tier;
- config;
- asset requirements.

Admin can enable/disable filters.

---

# 9. Current Repository Analysis

## 9.1 Current stack

Current project uses:
- Create React App;
- React 16.13;
- TypeScript;
- Redux Toolkit;
- React Redux;
- React Router v5;
- SCSS;
- Font Awesome 5;
- Mapbox GL 1.x;
- Cypress 4;
- Storybook 5;
- legacy Jeeliz/Three.js filter pipeline;
- static `public/api/*.json` demo backend.

## 9.2 Current route map

- `/` → Camera;
- `/ai` → AI Characters;
- `/ai/chat/:characterId` → AI Chat;
- `/ai/create` → AI Create;
- `/chats` → ChatTab;
- `/map` → SnapMap;
- `/account` → Account;
- fallback → 404.

## 9.3 Current AI persistence

Characters:
- `localStorage` key `ai_characters`.

Chats:
- `ai_chat_<characterId>`.

Memories:
- data model/local prefix exists;
- not actually used in model context.

## 9.4 Current provider implementation

`src/utils/ai/alibaba.ts` currently handles:
- API key;
- provider endpoint;
- fallback models;
- LLM chat;
- character suggestions;
- image generation;
- image edit;
- TTS;
- system prompt.

Move all of this out of the browser.

## 9.5 Critical security issue

The current public repository contains a provider key fallback in frontend source.

Required remediation:
1. revoke/rotate key;
2. remove fallback;
3. move provider calls backend-side;
4. purge secret from Git history if practical;
5. add secret scanning CI;
6. enable repository secret protection;
7. never expose provider secrets through frontend env vars.

## 9.6 Current correctness issues

### Duplicate user message in AI context

Current flow:
1. UI `addMessage(userMessage)`;
2. localStorage updates;
3. async `sendMessage` reloads history;
4. it appends the same current message again.

Target:
- backend persists message once;
- client sends a unique idempotency ID;
- context builder uses canonical DB history.

### Deep-link chat initialization

Current `currentCharacterId` depends on navigation through list.

Hard refresh on `/ai/chat/:id` can leave inconsistent state.

Target:
- route ID is canonical;
- fetch character/conversation by route params.

### Memory mismatch

UI says character remembers after clearing chat, but actual memory retrieval is missing.

Target:
- real memory service.

### Edit Character

Current chat menu routes to generic create page.

Target:
`/ai/characters/:id/edit`.

### Icon inconsistency

Some new AI screens use raw `<i class="fas ...">` while app otherwise uses React FontAwesome wrappers.

Target:
- one icon system.

### Provider region assumptions

Model availability/pricing differs by deployment scope.

Target:
- region-aware model registry.

### Static data

Session, friends, messages, photos are demo JSON.

Target:
- real backend.

## 9.7 Keep / Rewrite / Remove matrix

| Current area | Decision | Notes |
|---|---|---|
| Camera UX concept | KEEP + MODERNIZE | Preserve capture |
| CameraStore | REWRITE | Server media + modern state |
| Jeeliz filters | KEEP TEMPORARILY | Adapter + gradual replacement |
| PhotoCapture | REWRITE INCREMENTALLY | Media service |
| AICharacters | REWRITE | My/Discover/Nearby |
| AICharactersStore | REWRITE | Server source of truth |
| AIChat | REWRITE | Streaming/memory/media |
| AICreate | REWRITE | Public/private wizard |
| `utils/ai/alibaba.ts` | REMOVE FROM WEB | Backend provider adapter |
| ChatTab | REWRITE | Real conversations |
| ChatStore | REWRITE | API/realtime |
| UserStore | REWRITE | Auth/profile |
| SnapMap | MODERNIZE | AI nearby/map |
| SnapMapStore | REWRITE | Backend geospatial |
| Discover | REPURPOSE | AI/community feed |
| Search | MODERNIZE | Server search |
| Account | MODERNIZE | Real settings/billing |
| Drawer system | PARTIAL REUSE | Replace route-conflicting patterns |
| SCSS tokens | REPLACE | New design system |
| Static `/api/*.json` | FIXTURES ONLY | Never prod |
| Tests | KEEP THEN UPDATE | Regression value |
| CRA scripts | REMOVE | Vite monorepo |

---

# 10. Target Technology Stack

## 10.1 Monorepo

Use:
- pnpm workspaces;
- Turborepo.

## 10.2 User PWA

Recommended baseline:
- React 19.2 stable line;
- Vite 8 stable line;
- TypeScript strict;
- current stable React Router data-router API;
- Redux Toolkit + RTK Query;
- Tailwind CSS 4.x;
- CSS custom properties for brand/theme tokens;
- Radix UI primitives;
- custom shadcn-style component ownership without generic shadcn look;
- Motion for React;
- Lucide React icons;
- React Hook Form;
- Zod;
- React Virtuoso;
- Embla Carousel;
- accessible bottom sheets/drawers;
- Sonner-style toasts;
- date-fns;
- i18next;
- Dexie/IndexedDB;
- Vite PWA plugin/Workbox;
- Sentry;
- privacy-reviewed product analytics.

**Do not make ItChats look like a default component library demo.**

Use accessible primitives and build an original visual system.

## 10.3 Admin

- React 19;
- Vite 8;
- TypeScript;
- shared primitives;
- TanStack Table;
- Recharts/ECharts;
- RBAC-aware routing.

## 10.4 API

- Node current LTS;
- TypeScript;
- NestJS;
- Fastify adapter;
- OpenAPI;
- PostgreSQL;
- Drizzle ORM;
- SQL migrations;
- Redis;
- BullMQ;
- WebSocket/Socket.IO;
- SSE for AI streaming where useful;
- Stripe;
- S3-compatible object storage;
- OpenTelemetry;
- Sentry.

## 10.5 Worker

Dedicated worker handles:
- AI generation;
- story scheduling;
- memory extraction;
- moderation;
- media processing;
- push;
- thumbnails;
- cleanup;
- cost reconciliation.

## 10.6 Database extensions

- `pgcrypto`;
- `citext`;
- `pg_trgm`;
- `postgis`;
- `vector`.

## 10.7 Object storage

Use S3-compatible storage.

Logical buckets/prefixes:
- private uploads;
- public media;
- transient generation inputs;
- generated outputs;
- avatars;
- stories.

Use CDN for public media and signed URLs for private media.

---

# 11. Proposed Monorepo Structure

```text
itchats/
├─ apps/
│  ├─ web/
│  │  ├─ public/
│  │  │  ├─ icons/
│  │  │  ├─ manifest.webmanifest
│  │  │  └─ offline/
│  │  ├─ src/
│  │  │  ├─ app/
│  │  │  │  ├─ App.tsx
│  │  │  │  ├─ router.tsx
│  │  │  │  ├─ store.ts
│  │  │  │  ├─ providers.tsx
│  │  │  │  └─ error-boundary.tsx
│  │  │  ├─ components/
│  │  │  ├─ design-system/
│  │  │  ├─ features/
│  │  │  │  ├─ auth/
│  │  │  │  ├─ camera/
│  │  │  │  ├─ filters/
│  │  │  │  ├─ characters/
│  │  │  │  ├─ ai-chat/
│  │  │  │  ├─ chats/
│  │  │  │  ├─ stories/
│  │  │  │  ├─ discover/
│  │  │  │  ├─ nearby/
│  │  │  │  ├─ profile/
│  │  │  │  ├─ billing/
│  │  │  │  ├─ notifications/
│  │  │  │  └─ settings/
│  │  │  ├─ hooks/
│  │  │  ├─ lib/
│  │  │  ├─ services/
│  │  │  ├─ styles/
│  │  │  ├─ pwa/
│  │  │  ├─ i18n/
│  │  │  └─ main.tsx
│  │  ├─ vite.config.ts
│  │  └─ package.json
│  ├─ admin/
│  │  ├─ src/
│  │  │  ├─ app/
│  │  │  ├─ features/
│  │  │  │  ├─ dashboard/
│  │  │  │  ├─ users/
│  │  │  │  ├─ characters/
│  │  │  │  ├─ moderation/
│  │  │  │  ├─ models/
│  │  │  │  ├─ pricing/
│  │  │  │  ├─ subscriptions/
│  │  │  │  ├─ generations/
│  │  │  │  ├─ stories/
│  │  │  │  ├─ reports/
│  │  │  │  ├─ jobs/
│  │  │  │  ├─ feature-flags/
│  │  │  │  ├─ analytics/
│  │  │  │  └─ audit/
│  │  │  └─ main.tsx
│  │  └─ package.json
│  ├─ api/
│  │  ├─ src/
│  │  │  ├─ main.ts
│  │  │  ├─ app.module.ts
│  │  │  ├─ common/
│  │  │  ├─ config/
│  │  │  ├─ auth/
│  │  │  ├─ users/
│  │  │  ├─ characters/
│  │  │  ├─ conversations/
│  │  │  ├─ messages/
│  │  │  ├─ memory/
│  │  │  ├─ ai/
│  │  │  │  ├─ providers/alibaba/
│  │  │  │  ├─ router/
│  │  │  │  ├─ prompts/
│  │  │  │  ├─ costing/
│  │  │  │  └─ moderation/
│  │  │  ├─ generations/
│  │  │  ├─ media/
│  │  │  ├─ stories/
│  │  │  ├─ social/
│  │  │  ├─ nearby/
│  │  │  ├─ notifications/
│  │  │  ├─ billing/
│  │  │  ├─ admin/
│  │  │  ├─ health/
│  │  │  └─ telemetry/
│  │  └─ package.json
│  └─ worker/
│     ├─ src/
│     │  ├─ main.ts
│     │  ├─ queues/
│     │  ├─ processors/
│     │  └─ schedulers/
│     └─ package.json
├─ packages/
│  ├─ ui/
│  ├─ database/
│  │  ├─ src/schema/
│  │  └─ migrations/
│  ├─ contracts/
│  ├─ validation/
│  ├─ config/
│  ├─ ai-core/
│  ├─ eslint-config/
│  └─ tsconfig/
├─ infra/
│  ├─ docker/
│  ├─ nginx/
│  ├─ terraform/
│  └─ monitoring/
├─ scripts/
├─ docs/
├─ .github/workflows/
├─ package.json
├─ pnpm-workspace.yaml
├─ turbo.json
└─ README.md
```

---

# 12. Database Design

## 12.1 SQL conventions

- UUID primary keys.
- `timestamptz` timestamps.
- `numeric` for money/cost.
- JSONB only for flexible metadata, not everything.
- explicit foreign keys.
- indexed FKs/query paths.
- PostGIS for nearby.
- pgvector for memory.
- CITEXT for emails/handles.


## 12.2 PostgreSQL baseline migration

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE user_status AS ENUM ('pending','active','suspended','deleted');
CREATE TYPE character_visibility AS ENUM ('private','public','unlisted');
CREATE TYPE character_status AS ENUM (
  'draft','generating_identity','ready','published','suspended','disabled','deleted'
);
CREATE TYPE identity_origin AS ENUM (
  'text_generated',
  'private_text_generated',
  'private_uploaded_reference',
  'private_image_to_image',
  'public_regenerated_from_private_metadata'
);
CREATE TYPE conversation_type AS ENUM ('human_human','human_character','group');
CREATE TYPE message_sender_type AS ENUM ('user','character','system');
CREATE TYPE message_type AS ENUM ('text','image','video','audio','voice_note','system');
CREATE TYPE generation_type AS ENUM (
  'llm_chat','character_autofill','character_reference','text_to_image','image_to_image',
  'text_to_video','image_to_video','reference_to_video','tts','asr','embedding',
  'moderation','memory_extract','story_plan'
);
CREATE TYPE generation_status AS ENUM ('queued','processing','succeeded','failed','cancelled');
CREATE TYPE media_visibility AS ENUM ('private','public');
CREATE TYPE story_status AS ENUM ('draft','scheduled','generating','published','expired','failed','removed');
CREATE TYPE moderation_status AS ENUM ('pending','approved','flagged','rejected');
CREATE TYPE subscription_status AS ENUM ('trialing','active','past_due','paused','cancelled','expired');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE,
  username citext UNIQUE,
  password_hash text,
  status user_status NOT NULL DEFAULT 'pending',
  role text NOT NULL DEFAULT 'user',
  locale text NOT NULL DEFAULT 'en',
  timezone text NOT NULL DEFAULT 'UTC',
  date_of_birth date,
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE user_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name text,
  bio text,
  avatar_media_id uuid,
  theme_id text NOT NULL DEFAULT 'midnight',
  discoverable boolean NOT NULL DEFAULT true,
  private_account boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_account_id text NOT NULL,
  access_token_encrypted text,
  refresh_token_encrypted text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_account_id)
);

CREATE TABLE devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text,
  platform text,
  user_agent text,
  last_ip inet,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  device_id uuid REFERENCES devices(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  rotated_from_id uuid REFERENCES refresh_tokens(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id uuid REFERENCES devices(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE TABLE subscription_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  monthly_price_usd numeric(12,4) NOT NULL,
  monthly_credits bigint NOT NULL,
  max_private_characters integer NOT NULL,
  max_public_characters integer NOT NULL,
  max_auto_story_characters integer NOT NULL,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES subscription_plans(id),
  provider text NOT NULL DEFAULT 'stripe',
  provider_customer_id text,
  provider_subscription_id text UNIQUE,
  status subscription_status NOT NULL,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE credit_wallets (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_credited bigint NOT NULL DEFAULT 0,
  lifetime_debited bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta bigint NOT NULL,
  balance_after bigint NOT NULL,
  reason text NOT NULL,
  reference_type text,
  reference_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_credit_ledger_user_created ON credit_ledger(user_id, created_at DESC);

CREATE TABLE ai_providers (
  id text PRIMARY KEY,
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  config_key text NOT NULL,
  base_url_key text,
  region text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id text NOT NULL REFERENCES ai_providers(id),
  model_key text NOT NULL,
  display_name text NOT NULL,
  capability generation_type NOT NULL,
  deployment_scope text,
  region text,
  enabled boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  pricing_rule jsonb NOT NULL,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_id, model_key, capability, region)
);

CREATE TABLE model_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_key text NOT NULL,
  model_id uuid NOT NULL REFERENCES ai_models(id),
  priority integer NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  min_plan_id text REFERENCES subscription_plans(id),
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(route_key, model_id)
);
CREATE INDEX idx_model_routes_lookup ON model_routes(route_key, enabled, priority);

CREATE TABLE prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  version integer NOT NULL,
  content text NOT NULL,
  schema_json jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(key, version)
);

CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  visibility media_visibility NOT NULL,
  storage_provider text NOT NULL,
  bucket text NOT NULL,
  object_key text NOT NULL,
  mime_type text NOT NULL,
  media_type text NOT NULL,
  width integer,
  height integer,
  duration_ms integer,
  bytes bigint,
  sha256 text,
  moderation_status moderation_status NOT NULL DEFAULT 'pending',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(storage_provider, bucket, object_key)
);

ALTER TABLE user_profiles
  ADD CONSTRAINT fk_user_profile_avatar
  FOREIGN KEY (avatar_media_id) REFERENCES media_assets(id) ON DELETE SET NULL;

CREATE TABLE characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  handle citext UNIQUE,
  visibility character_visibility NOT NULL DEFAULT 'private',
  status character_status NOT NULL DEFAULT 'draft',
  identity_origin identity_origin NOT NULL,
  identity_version integer NOT NULL DEFAULT 1,
  avatar_media_id uuid REFERENCES media_assets(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  personality text NOT NULL DEFAULT '',
  backstory text NOT NULL DEFAULT '',
  age_display text,
  gender text,
  pronouns text,
  occupation text,
  interests jsonb NOT NULL DEFAULT '[]'::jsonb,
  dislikes jsonb NOT NULL DEFAULT '[]'::jsonb,
  values_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  speaking_style text,
  humor_style text,
  languages jsonb NOT NULL DEFAULT '["en"]'::jsonb,
  default_language text NOT NULL DEFAULT 'en',
  emotion_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  autonomy_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_style jsonb NOT NULL DEFAULT '{}'::jsonb,
  moderation_status moderation_status NOT NULL DEFAULT 'pending',
  is_ai_disclosure_required boolean NOT NULL DEFAULT true,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_characters_owner ON characters(owner_user_id, created_at DESC);
CREATE INDEX idx_characters_public ON characters(status, visibility, published_at DESC)
  WHERE visibility = 'public' AND deleted_at IS NULL;
CREATE INDEX idx_characters_name_trgm ON characters USING gin(name gin_trgm_ops);

CREATE TABLE character_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  version integer NOT NULL,
  canonical_prompt text NOT NULL,
  negative_prompt text,
  structured_identity jsonb NOT NULL,
  source_identity_origin identity_origin NOT NULL,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(character_id, version)
);

CREATE TABLE character_reference_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  character_version_id uuid NOT NULL REFERENCES character_versions(id) ON DELETE CASCADE,
  media_asset_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  reference_type text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  generation_job_id uuid,
  approved boolean NOT NULL DEFAULT false,
  quality_score numeric(6,4),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_character_reference_assets_character
  ON character_reference_assets(character_id, approved, sort_order);

CREATE TABLE character_voice_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  provider_id text REFERENCES ai_providers(id),
  model_key text,
  voice_key text,
  language text,
  speed numeric(5,3) NOT NULL DEFAULT 1.0,
  pitch numeric(5,3),
  style jsonb NOT NULL DEFAULT '{}'::jsonb,
  preview_media_id uuid REFERENCES media_assets(id),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE character_locations (
  character_id uuid PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  city text,
  region text,
  country_code text,
  timezone text,
  public_point geography(Point, 4326),
  location_label text,
  source text NOT NULL DEFAULT 'declared',
  precision_meters integer NOT NULL DEFAULT 5000,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_character_locations_geo ON character_locations USING gist(public_point);

CREATE TABLE character_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visible_level numeric(5,2) NOT NULL DEFAULT 1.0 CHECK (visible_level >= 1 AND visible_level <= 10),
  familiarity numeric(6,3) NOT NULL DEFAULT 0,
  trust numeric(6,3) NOT NULL DEFAULT 0,
  warmth numeric(6,3) NOT NULL DEFAULT 0,
  affinity numeric(6,3) NOT NULL DEFAULT 0,
  tension numeric(6,3) NOT NULL DEFAULT 0,
  interaction_count bigint NOT NULL DEFAULT 0,
  last_interaction_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(character_id, user_id)
);

CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type conversation_type NOT NULL,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  title text,
  summary text,
  summary_updated_at timestamptz,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_conversations_character ON conversations(character_id, last_message_at DESC);

CREATE TABLE conversation_participants (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_message_id uuid,
  muted_until timestamptz,
  archived_at timestamptz,
  PRIMARY KEY(conversation_id, user_id)
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type message_sender_type NOT NULL,
  sender_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  sender_character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  type message_type NOT NULL DEFAULT 'text',
  content text,
  reply_to_message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  model_generation_id uuid,
  client_idempotency_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  UNIQUE(conversation_id, client_idempotency_key)
);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

CREATE TABLE message_attachments (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  media_asset_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY(message_id, media_asset_id)
);

CREATE TABLE character_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  content text NOT NULL,
  memory_type text NOT NULL,
  importance numeric(5,4) NOT NULL DEFAULT 0.5,
  confidence numeric(5,4) NOT NULL DEFAULT 0.5,
  embedding vector(1024),
  source_message_ids uuid[] NOT NULL DEFAULT '{}',
  last_recalled_at timestamptz,
  recall_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_character_memories_scope
  ON character_memories(character_id, user_id, created_at DESC);
CREATE INDEX idx_character_memories_embedding
  ON character_memories USING hnsw (embedding vector_cosine_ops);

CREATE TABLE generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  generation_type generation_type NOT NULL,
  status generation_status NOT NULL DEFAULT 'queued',
  route_key text NOT NULL,
  model_id uuid REFERENCES ai_models(id),
  provider_request_id text,
  idempotency_key text NOT NULL,
  request_json jsonb NOT NULL,
  response_json jsonb,
  error_code text,
  error_message_safe text,
  attempt_count integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, idempotency_key)
);
CREATE INDEX idx_generation_jobs_status_created ON generation_jobs(status, created_at);

CREATE TABLE usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  generation_job_id uuid REFERENCES generation_jobs(id) ON DELETE SET NULL,
  provider_id text REFERENCES ai_providers(id),
  model_id uuid REFERENCES ai_models(id),
  generation_type generation_type NOT NULL,
  input_tokens bigint,
  output_tokens bigint,
  input_characters bigint,
  audio_seconds numeric(12,3),
  video_seconds numeric(12,3),
  image_count integer,
  provider_cost_usd numeric(18,8) NOT NULL DEFAULT 0,
  overhead_factor numeric(8,4) NOT NULL DEFAULT 1,
  target_margin numeric(8,4) NOT NULL DEFAULT 0,
  calculated_retail_usd numeric(18,8) NOT NULL DEFAULT 0,
  credits_debited bigint NOT NULL DEFAULT 0,
  pricing_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_usage_events_user_created ON usage_events(user_id, created_at DESC);
CREATE INDEX idx_usage_events_model_created ON usage_events(model_id, created_at DESC);

CREATE TABLE stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  author_character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  status story_status NOT NULL DEFAULT 'draft',
  media_asset_id uuid REFERENCES media_assets(id) ON DELETE SET NULL,
  caption text,
  story_type text NOT NULL,
  generated boolean NOT NULL DEFAULT false,
  generation_job_id uuid REFERENCES generation_jobs(id),
  moderation_status moderation_status NOT NULL DEFAULT 'pending',
  scheduled_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (author_user_id IS NOT NULL AND author_character_id IS NULL)
    OR
    (author_user_id IS NULL AND author_character_id IS NOT NULL)
  )
);
CREATE INDEX idx_stories_public_feed ON stories(status, published_at DESC, expires_at);
CREATE INDEX idx_stories_character ON stories(author_character_id, published_at DESC);

CREATE TABLE story_views (
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(story_id, viewer_user_id)
);

CREATE TABLE character_follows (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, character_id)
);

CREATE TABLE content_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);

CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  parent_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  moderation_status moderation_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  blocked_character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (blocked_user_id IS NOT NULL OR blocked_character_id IS NOT NULL)
);
CREATE UNIQUE INDEX idx_unique_user_block
  ON user_blocks(blocker_user_id, blocked_user_id)
  WHERE blocked_user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_unique_character_block
  ON user_blocks(blocker_user_id, blocked_character_id)
  WHERE blocked_character_id IS NOT NULL;

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  reason text NOT NULL,
  detail text,
  status text NOT NULL DEFAULT 'open',
  assigned_admin_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX idx_reports_status_created ON reports(status, created_at);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, read_at, created_at DESC);

CREATE TABLE feature_flags (
  key text PRIMARY KEY,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_memberships (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES admin_roles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  before_json jsonb,
  after_json jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_audit_created ON admin_audit_logs(created_at DESC);

CREATE TABLE provider_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id text REFERENCES ai_providers(id),
  model_id uuid REFERENCES ai_models(id),
  incident_type text NOT NULL,
  status text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## 12.3 Publication constraints

Public publication service MUST assert:
- visibility is public;
- identity origin is public-safe;
- approved reference assets exist;
- canonical identity version is locked;
- moderation is approved;
- handle exists;
- AI disclosure is enabled;
- no private-upload reference is attached to active public identity version.

Private → Public must regenerate visual identity when private identity provenance is upload/i2i.

## 12.4 Updated-at trigger

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Attach to mutable tables.

## 12.5 Nearby query

```sql
SELECT
  c.id,
  c.name,
  c.handle,
  cl.location_label,
  ST_Distance(
    cl.public_point,
    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
  ) AS distance_meters
FROM characters c
JOIN character_locations cl ON cl.character_id = c.id
WHERE c.visibility = 'public'
  AND c.status = 'published'
  AND c.moderation_status = 'approved'
  AND ST_DWithin(
    cl.public_point,
    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
    $3
  )
ORDER BY distance_meters
LIMIT $4;
```

Displayed distance must be bucketed/coarsened; do not return exact coordinates to public clients unless needed for a deliberately coarse map marker.

---

# 13. API Contract

## 13.1 Conventions

Base: `/v1`

Use:
- JSON;
- RFC-7807-style errors;
- cursor pagination;
- typed contracts;
- request IDs;
- user identity from auth context;
- rate limits;
- `Idempotency-Key` for paid writes.

Never trust a client-supplied `userId` for ownership.

## 13.2 Auth

```text
POST   /v1/auth/register
POST   /v1/auth/login
POST   /v1/auth/refresh
POST   /v1/auth/logout
POST   /v1/auth/logout-all
GET    /v1/auth/me
POST   /v1/auth/verify-email
POST   /v1/auth/password/forgot
POST   /v1/auth/password/reset
GET    /v1/auth/oauth/:provider/start
GET    /v1/auth/oauth/:provider/callback
```

## 13.3 User

```text
GET    /v1/users/me
PATCH  /v1/users/me
DELETE /v1/users/me
POST   /v1/users/me/export
GET    /v1/users/:handle
GET    /v1/users/me/devices
DELETE /v1/users/me/devices/:deviceId
```

## 13.4 Characters

```text
POST   /v1/characters
GET    /v1/characters/mine
GET    /v1/characters/:characterId
PATCH  /v1/characters/:characterId
DELETE /v1/characters/:characterId

POST   /v1/characters/:characterId/identity/plan
POST   /v1/characters/:characterId/identity/generate
GET    /v1/characters/:characterId/identity/jobs/:jobId
POST   /v1/characters/:characterId/identity/references/:referenceId/approve
POST   /v1/characters/:characterId/identity/finalize

POST   /v1/characters/:characterId/publish
POST   /v1/characters/:characterId/unpublish
POST   /v1/characters/:characterId/regenerate-public-identity

POST   /v1/characters/:characterId/voice/preview
PATCH  /v1/characters/:characterId/voice

GET    /v1/characters/discover
GET    /v1/characters/nearby
GET    /v1/characters/search
POST   /v1/characters/:characterId/follow
DELETE /v1/characters/:characterId/follow
```

## 13.5 Conversations

```text
POST   /v1/conversations
GET    /v1/conversations
GET    /v1/conversations/:conversationId
GET    /v1/conversations/:conversationId/messages
POST   /v1/conversations/:conversationId/messages
DELETE /v1/conversations/:conversationId/messages
POST   /v1/conversations/:conversationId/read
POST   /v1/conversations/:conversationId/archive
POST   /v1/conversations/:conversationId/mute
POST   /v1/conversations/:conversationId/forget-me
```

AI message flow:
- persist user message once;
- create job;
- reserve credits;
- stream assistant via SSE;
- persist final character message;
- reconcile actual provider cost;
- enqueue memory extraction.

## 13.6 Generations

```text
POST   /v1/generations/images
POST   /v1/generations/image-edits
POST   /v1/generations/videos
POST   /v1/generations/tts
POST   /v1/generations/asr
GET    /v1/generations/:jobId
POST   /v1/generations/:jobId/cancel
```

## 13.7 Stories

```text
GET    /v1/stories/feed
GET    /v1/stories/following
GET    /v1/stories/nearby
GET    /v1/characters/:characterId/stories
POST   /v1/stories
DELETE /v1/stories/:storyId
POST   /v1/stories/:storyId/view
POST   /v1/stories/:storyId/like
DELETE /v1/stories/:storyId/like
```

## 13.8 Social/moderation

```text
POST   /v1/reports
POST   /v1/blocks/users/:userId
POST   /v1/blocks/characters/:characterId
DELETE /v1/blocks/users/:userId
DELETE /v1/blocks/characters/:characterId
```

---

# 14. AI Provider Architecture

## 14.1 Browser never calls Alibaba with a private key

```text
PWA
 ↓
ItChats API
 ↓
Authorization / entitlement / credits
 ↓
Prompt builder / moderation
 ↓
Model router
 ↓
Alibaba provider adapter
 ↓
Usage capture
 ↓
Response or job
```

## 14.2 Provider interfaces

```ts
interface TextGenerationProvider {
  chat(request: ChatRequest): Promise<ChatResponse>;
  streamChat(request: ChatRequest): AsyncIterable<ChatDelta>;
}

interface ImageGenerationProvider {
  textToImage(request: TextToImageRequest): Promise<ImageResult>;
  imageToImage(request: ImageToImageRequest): Promise<ImageResult>;
}

interface VideoGenerationProvider {
  createVideo(request: VideoRequest): Promise<ProviderAsyncJob>;
  getVideoJob(id: string): Promise<ProviderAsyncJobStatus>;
}

interface SpeechProvider {
  textToSpeech(request: TTSRequest): Promise<AudioResult>;
  speechToText(request: ASRRequest): Promise<TranscriptResult>;
}

interface EmbeddingProvider {
  embedText(input: string[]): Promise<number[][]>;
}
```

## 14.3 Route keys

Product code uses route keys, not raw model IDs:

```text
chat.standard
chat.premium
character.autofill
character.memory.extract
character.story.plan
image.character.reference
image.standard
image.premium
image.edit.private
video.standard
video.premium
tts.standard
tts.realtime
asr.standard
embedding.memory
moderation.text
moderation.image
```

## 14.4 Fallback rules

Fallback only if:
- capability matches;
- region matches;
- safety policy matches;
- request parameters are supported;
- plan entitlement matches;
- estimated cost stays within max fallback multiplier.

Do not blindly try every model.

## 14.5 Circuit breaker

Track:
- timeout rate;
- 429 rate;
- 5xx rate;
- latency;
- success rate.

Unhealthy model:
- circuit opens;
- route falls back;
- incident visible in admin.


# 15. Alibaba Model Baseline and Verified Pricing

## 15.1 Pricing rule

The following prices were verified against Alibaba Cloud Model Studio documentation on 2026-07-24.

Provider prices and promotions can change.

Therefore:
- seed these values as initial configuration;
- store pricing in the model registry;
- do not hardcode provider price into UI;
- snapshot the pricing used for every usage event;
- provide admin editing and effective-date history before launch.

## 15.2 Current chat models

### `qwen3.5-flash`

International:
- input: **$0.10 / 1M tokens**;
- output: **$0.40 / 1M tokens**.

Some Global deployments have different tiered rates. Billing must use configured region price.

Recommended default role:
- standard AI chat;
- character autofill;
- cheap relationship/memory helper tasks where quality passes tests.

### `qwen3.6-flash`

International, input ≤256K:
- input: **$0.25 / 1M**;
- output: **$1.50 / 1M**.

256K–1M:
- input: **$1.00 / 1M**;
- output: **$4.00 / 1M**.

Recommended role:
- quality fallback;
- premium chat route;
- difficult structured generation.

### `deepseek-v4-flash`

International:
- input: **$0.20 / 1M**;
- output: **$0.40 / 1M**.

Recommended role:
- alternate standard chat route;
- fallback after quality/latency evaluation.

### `qwen-flash`

International, ≤256K:
- input: **$0.05 / 1M**;
- output: **$0.40 / 1M**.

Recommended role:
- low-cost fallback/background tasks.

## 15.3 Image models

### `qwen-image-2.0`

International:
- **$0.035 / image**.

Use for:
- standard character selfies;
- story images;
- affordable social image generation.

### `qwen-image-2.0-pro`

International:
- **$0.075 / image**.

Use for:
- canonical public character reference pack;
- premium portrait/hero generation;
- difficult identity-quality cases.

### `qwen-image-edit-plus`

International:
- **$0.03 / image**.

Use for:
- private character image editing;
- public character consistency only when inputs are the character's own generated references.

### `wan2.2-t2i-plus`

International:
- **$0.05 / image**.

Existing code fallback.
Do not keep it as default solely because it is already in code.

### `wan2.6-t2i`

International:
- **$0.03 / image**.

Candidate lower-cost standard route.

## 15.4 Video models

### `wan2.6-i2v-flash`

International:
- 720p silent: **$0.025/sec**;
- 720p with audio: **$0.05/sec**;
- 1080p silent: **$0.0375/sec**;
- 1080p with audio: **$0.075/sec**.

Recommended cost-controlled default.

### `wan2.7-i2v`

International:
- 720p audio: **$0.10/sec**;
- 1080p audio: **$0.15/sec**.

Recommended premium route.

**Video is the highest COGS risk. It must always be credit-metered and daily-capped.**

## 15.5 TTS

The current code references `qwen3-tts-flash`, but non-realtime availability differs by deployment region.

International realtime candidate:
`qwen3-tts-flash-realtime`
- **$0.13 / 10,000 input characters**.

Do not assume the Chinese-mainland model key/endpoints are portable internationally.
Use region-aware model routes.

## 15.6 ASR

`qwen3-asr-flash`, International:
- **$0.000035 / second** of input audio.

## 15.7 Embeddings

`text-embedding-v4`, International:
- **$0.07 / 1M input tokens**.

Recommended memory embedding dimension:
- **1024**.

---

# 16. Pricing, Margin and Credit System

## 16.1 Why credits

Different capabilities charge in:
- tokens;
- characters;
- images;
- seconds.

Expose one product currency: **ItChats Credits**.

Recommended:
**1 credit = $0.001 of retail AI compute value.**

## 16.2 Cost formula

For every billable action:

```text
provider_cost
× infrastructure_and_retry_reserve
÷ (1 - target_gross_margin)
= retail_compute_value
```

Recommended launch configuration:
- infrastructure/retry/storage reserve = **1.25**;
- target AI gross margin = **75%**.

Therefore:

```text
retail_compute_value ≈ provider_cost × 5
```

Credits:

```text
credits = ceil(retail_compute_value / 0.001)
```

Use minimum charges for tiny calls to cover orchestration overhead.

## 16.3 Example action costs

### Standard image — qwen-image-2.0
- provider: $0.035;
- retail compute: $0.175;
- charge: **175 credits**.

### Premium image — qwen-image-2.0-pro
- provider: $0.075;
- retail compute: $0.375;
- charge: **375 credits**.

### Private image edit — qwen-image-edit-plus
- provider: $0.03;
- retail compute: $0.15;
- charge: **150 credits**.

### 4-image public canonical reference pack
4 × qwen-image-2.0-pro:
- provider: $0.30;
- retail compute: $1.50;
- base: 1,500 credits;
- recommended product charge with planning/validation: **1,600 credits**.

### 5-second 720p silent standard video
wan2.6-i2v-flash:
- provider: $0.125;
- retail compute: $0.625;
- charge: **625 credits**.

### 5-second 720p audio standard video
- provider: $0.25;
- retail: $1.25;
- charge: **1,250 credits**.

### 5-second 720p premium video
wan2.7-i2v:
- provider: $0.50;
- retail: $2.50;
- charge: **2,500 credits**.

### TTS — 300 chars
- provider ≈ $0.0039;
- retail ≈ $0.0195;
- charge: **20 credits**.

### ASR — 30 seconds
- provider ≈ $0.00105;
- retail ≈ $0.00525;
- charge: **6 credits** minimum.

### Typical short chat
Example 2,000 input + 300 output tokens on qwen3.5-flash:
- input ≈ $0.00020;
- output ≈ $0.00012;
- provider ≈ $0.00032;
- raw retail ≈ $0.0016.

Set product minimum **2–5 credits** depending on route and context.

Actual billing uses actual provider usage where available.

## 16.4 Credit reservation

For async generation:
1. estimate maximum credits;
2. transactionally reserve;
3. create job;
4. execute provider;
5. calculate actual;
6. debit actual;
7. release excess reserve;
8. refund on non-billable failure.

Wallet can never go negative.

## 16.5 Cost ledger invariants

Every provider request must create or link:
- generation job;
- usage event;
- pricing snapshot;
- credit ledger event if charged.

Do not calculate historical cost using today's prices.

---

# 17. Proposed Subscription Plans

These are a recommended launch structure and must remain admin-configurable.

## FREE — $0

Purpose:
- acquisition;
- trial;
- community browsing.

Included:
- 1 private character;
- 0–1 limited public character;
- 1,000 monthly credits;
- standard chat;
- limited reference generation;
- no automatic video stories;
- normal/free queue.

## PLUS — $9.99/month

Included:
- 5 private characters;
- 2 public characters;
- 12,000 credits/month;
- voice features;
- standard image generation;
- limited video;
- 1 auto-story character;
- standard queue.

Provider-equivalent maximum full credit burn at 5x mapping:
~$2.40 before fixed non-AI overhead.

## PRO — $24.99/month

Included:
- 15 private characters;
- 6 public characters;
- 35,000 credits/month;
- premium image route;
- more video;
- 3 auto-story characters;
- faster queue;
- advanced editor;
- deeper memory retention.

Provider-equivalent full burn:
~$7.00.

## CREATOR — $49.99/month

Included:
- 40 private characters;
- 20 public characters;
- 80,000 credits/month;
- 10 auto-story characters;
- creator analytics;
- public creator page;
- bulk character management;
- higher daily caps;
- premium queue.

Provider-equivalent full burn:
~$16.00.

## STUDIO — $99.99/month

Included:
- 100 private characters;
- 50 public characters;
- 180,000 credits/month;
- 25 auto-story characters;
- high concurrency;
- advanced analytics;
- priority queue/support.

Provider-equivalent full burn:
~$36.00.

## 17.1 Credit packs

Initial candidates:
- 5,000 credits → $6.99;
- 15,000 credits → $18.99;
- 50,000 credits → $59.99.

Do not let packs accidentally make subscriptions irrational.

## 17.2 Rollover

Recommended:
- subscription credits expire at period end;
- purchased credits can have a longer validity period subject to terms/law;
- consume expiring credits first.

## 17.3 Plan abuse controls

Configure per plan:
- max concurrent generations;
- images/day;
- video seconds/day;
- TTS chars/day;
- auto-story spend/day;
- public character count;
- generation job queue priority.

---

# 18. Admin Panel Specification

## 18.1 Dashboard

Show:
- DAU/WAU/MAU;
- new users;
- paid users;
- MRR;
- plan distribution;
- churn;
- credit usage;
- provider cost;
- estimated gross margin;
- AI spend by capability;
- top models;
- provider error rate;
- generation jobs;
- public characters;
- stories generated;
- moderation backlog.

## 18.2 User management

Admin can:
- search;
- inspect profile;
- see account status;
- see plan;
- see wallet;
- see usage;
- credit/debit wallet with reason;
- suspend/unsuspend;
- force logout;
- disable public posting;
- view owned characters;
- view reports;
- start export;
- process deletion;
- see audit history.

Sensitive actions require reason + audit record.

## 18.3 Character management

Admin can:
- search/filter;
- inspect identity provenance;
- inspect public reference pack;
- approve/reject public character;
- suspend;
- disable;
- unlist;
- remove story;
- force story regeneration;
- set categories/tags;
- feature/unfeature;
- disable auto-stories;
- create platform-owned character;
- edit platform-owned character;
- inspect moderation history.

Private content access must be privilege-gated and audited.

## 18.4 Model management

Admin can:
- add model;
- enable/disable;
- change priority;
- set region/scope;
- edit pricing;
- configure limits;
- define plan requirement;
- set timeout;
- set retry limit;
- set max fallback multiplier;
- inspect health.

Secrets are secret-manager references, never plaintext DB fields.

## 18.5 Route management

Example route `chat.standard`:
1. qwen3.5-flash — priority 10;
2. deepseek-v4-flash — priority 20;
3. qwen-flash — priority 30;
4. qwen3.6-flash — premium/quality fallback.

Admin can reorder without deployment.

## 18.6 Pricing controls

Admin configures:
- reserve multiplier;
- target gross margin;
- minimum credits by capability;
- manual credit override;
- model prices;
- plan price;
- plan credits;
- top-up pricing.

Warn if configuration predicts negative/low margin.

## 18.7 Generation monitor

Filter by:
- user;
- character;
- model;
- provider;
- capability;
- status;
- date;
- cost;
- credits;
- latency.

Actions:
- inspect safe metadata;
- retry;
- cancel queued;
- refund;
- mark provider incident.

## 18.8 Moderation

Queues:
- public character approval;
- reported character;
- reported story;
- reported comment;
- media moderation;
- handle/name review.

Actions:
- approve;
- reject;
- remove;
- warn;
- suspend character;
- suspend user;
- permanent disable.

## 18.9 Story control

Admin can:
- inspect scheduled stories;
- pause scheduler globally;
- pause per user/character;
- set media mix;
- set default cadence;
- enforce global budget;
- remove/regenerate.

## 18.10 Feature flags

Examples:
- `public_characters`;
- `private_image_uploads`;
- `ai_video_generation`;
- `public_auto_stories`;
- `nearby_ai`;
- `human_chats`;
- `voice_chat`;
- `premium_models`;
- `comments`;
- `character_clone`;
- `experimental_filters`.

Support user/plan/percentage targeting.

## 18.11 Audit

Log:
- admin;
- action;
- entity;
- before;
- after;
- IP;
- UA;
- timestamp.

Normal admins cannot erase audit history.

---

# 19. UI/UX Master Direction

## 19.1 Design goal

ItChats should feel:
- camera-native;
- intimate;
- fast;
- premium;
- futuristic without crypto-dashboard energy;
- playful without childishness;
- visually alive;
- clearly original.

Do NOT inherit the current purple palette just because it exists.

## 19.2 Mobile-first baseline

Primary design width:
- 360–430 CSS px.

Design for:
- one-handed use;
- safe areas;
- thumb reach;
- iOS PWA;
- Android PWA;
- camera/mic permissions;
- virtual keyboard;
- bottom nav.

Desktop:
- centered app shell or responsive multi-column social layout;
- admin separately desktop-first.

## 19.3 Suggested visual concept — “Living Lens”

Base:
- near-black ink backgrounds;
- luminous neutral surfaces;
- spectral accent;
- warm social accent;
- organic gradients;
- restrained glass;
- expressive media;
- crisp typography.

Avoid:
- purple everywhere;
- neon everywhere;
- glow on every component;
- generic AI sparkle clichés;
- Snapchat yellow/ghost identity.

## 19.4 Theme engine

Required themes:

### Midnight
Deep dark default.

### Daylight
Clean light.

### Aurora
Dark cool cyan/teal spectral accents.

### Ember
Dark warm orange/red social tone.

### Violet Glass
Optional premium AI-forward theme.

Users can choose system or explicit theme.

## 19.5 Semantic tokens

```css
:root {
  --bg-canvas: ...;
  --bg-surface: ...;
  --bg-elevated: ...;
  --bg-glass: ...;
  --text-primary: ...;
  --text-secondary: ...;
  --text-muted: ...;
  --text-inverse: ...;
  --brand-primary: ...;
  --brand-secondary: ...;
  --social-warm: ...;
  --success: ...;
  --warning: ...;
  --danger: ...;
  --border-subtle: ...;
  --border-strong: ...;
  --shadow-sm: ...;
  --shadow-md: ...;
  --shadow-lg: ...;
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 22px;
  --radius-pill: 999px;
}
```

No raw feature-specific color sprawl.

## 19.6 Typography

Use high-quality variable fonts with Arabic support.

Suggested strategy:
- Latin: Geist/Inter/Plus Jakarta Sans style;
- Arabic fallback: Noto Sans Arabic or equivalent.

RTL is a first-class requirement.

## 19.7 Bottom navigation

Five zones:
1. Camera;
2. Chats;
3. AI / World;
4. Nearby;
5. Profile.

Center AI tab may be distinctive but keeps consistent tap target.

## 19.8 AI home

Top:
- story tray.

Then:
- My AI People;
- For You;
- Nearby;
- Trending;
- categories;
- create CTA.

Tabs:
- My;
- Discover.

## 19.9 Character card

Show:
- avatar;
- AI badge;
- name;
- short status;
- relationship preview;
- coarse location if public;
- latest interaction;
- story ring;
- follow state where relevant.

Motion is restrained and touch-first.

## 19.10 AI Chat

Header:
- back;
- avatar;
- name;
- AI badge;
- relationship;
- voice shortcut future;
- menu.

Messages:
- virtualized;
- streaming;
- rich media;
- waveform;
- images;
- videos;
- typing indicator.

Composer:
- text;
- camera;
- gallery;
- voice;
- generate media;
- send.

Long press:
- copy;
- reply;
- regenerate AI response if allowed;
- report;
- delete local view where applicable.

## 19.11 Character creation wizard

Steps:
1. Public / Private;
2. Identity concept;
3. Appearance;
4. Generate preview;
5. Reference pack;
6. Personality;
7. Voice;
8. Location;
9. Autonomy;
10. Review;
11. Create/Publish.

Private mode exposes upload/i2i.
Public mode does not.

## 19.12 Camera

Camera launches quickly with minimal chrome.

Controls:
- capture;
- filter carousel;
- flip;
- flash if supported;
- gallery;
- AI media shortcut;
- story/send flow.

## 19.13 Accessibility

Target WCAG 2.2 AA:
- 44×44 touch targets;
- visible focus;
- reduced motion;
- semantic labels;
- accessible dialogs;
- keyboard support desktop;
- color not sole status signal;
- captions/transcripts where possible.

---

# 20. PWA Requirements

## 20.1 Installability

Include:
- manifest;
- 192/512 icons;
- maskable icons;
- apple touch icon;
- theme/background colors;
- service worker;
- HTTPS;
- offline fallback.

## 20.2 Original branding assets

Generate:
- app icon;
- monochrome icon;
- maskable icon;
- notification icon;
- splash assets;
- favicon;
- social share image;
- AI badge;
- default avatar.

Do not reuse Snapchat assets.

## 20.3 Caching

Cache-first:
- app shell;
- icons;
- fonts;
- static filter assets.

Stale-while-revalidate:
- public metadata/thumbnails where safe.

Network-first:
- authenticated conversations;
- wallet;
- subscription;
- admin;
- current story feed.

Never put sensitive private media in shared public cache.

## 20.4 Offline

Offline supports:
- app shell;
- cached character list;
- cached recent conversations;
- draft messages;
- draft character form;
- safe pending-upload metadata.

Paid AI generation requires network.

## 20.5 Push

Web Push:
- new human message;
- AI reply;
- followed character story if opted in;
- generation complete;
- billing issue;
- moderation/account issue.

## 20.6 Service worker update UX

When update ready:
- show unobtrusive prompt;
- never reload while recording/capturing;
- activate safely.

---

# 21. Authentication and Security

## 21.1 Auth

Support:
- email/password;
- Google OAuth;
- Apple OAuth.

Use:
- Argon2id;
- rotating refresh tokens;
- hashed token storage;
- short-lived access tokens or secure session cookies;
- HTTP-only Secure cookies where applicable;
- SameSite;
- CSRF protection for cookie-auth writes.

## 21.2 Secrets

Backend secrets:
- Alibaba;
- Stripe;
- DB;
- Redis;
- storage;
- OAuth;
- token signing;
- web push.

Use secret manager/deployment secrets.

Frontend receives public config only.

## 21.3 Rate limiting

Limit:
- auth;
- chat;
- generations;
- upload signing;
- reports;
- search;
- public APIs;
- admin.

Keys can combine user/IP/device/plan.

## 21.4 Upload security

- signed URL;
- max size;
- MIME sniff;
- re-encode images;
- EXIF strip;
- video duration cap;
- malware scanning where appropriate;
- private by default;
- moderation before public use.

## 21.5 Public AI disclosure

Every public AI profile:
- visible AI badge;
- clear text disclosure.

Every public generated story:
- generated flag;
- visible disclosure in details/menu;
- optional watermark based on brand policy.

The product must not intentionally trick users into thinking a local public AI is a real nearby human.

## 21.6 Location privacy

Never leak:
- creator GPS;
- home address;
- raw location history.

Nearby character positions are synthetic/coarse.

## 21.7 Data rights

Implement:
- data export;
- account deletion;
- character deletion;
- conversation deletion;
- session revocation;
- uploaded reference deletion.

## 21.8 Security headers

Use:
- CSP;
- HSTS;
- Referrer-Policy;
- Permissions-Policy;
- X-Content-Type-Options;
- anti-framing policy.

---

# 22. Moderation and Trust

Public community requires:
- creation moderation;
- generated media moderation;
- text moderation;
- reports;
- user blocks;
- admin review;
- repeat-offender actions.

Keep separate policy profiles for:
- public generation;
- private generation;
- underage accounts;
- comments;
- public stories.

Age-gated product features must be configurable.

---

# 23. AI Chat Prompt Architecture

## 23.1 Layering

```text
PLATFORM SAFETY ENVELOPE
PRODUCT CHARACTER RULES
CHARACTER CANONICAL PROFILE
DYNAMIC STATE
RELATIONSHIP STATE
RETRIEVED MEMORIES
CONVERSATION SUMMARY
RECENT MESSAGES
CURRENT USER MESSAGE
```

Prompt construction lives backend-side.

## 23.2 Canonical character example

```json
{
  "name": "Maya",
  "agePresentation": "25",
  "pronouns": "she/her",
  "languages": ["en", "ar"],
  "personality": {
    "warmth": 0.8,
    "extraversion": 0.6,
    "curiosity": 0.9,
    "humor": "dry playful"
  },
  "backstory": "...",
  "speakingStyle": {
    "messageLength": "short",
    "emojiFrequency": "low",
    "slang": "moderate"
  },
  "visualIdentityVersion": 3
}
```

## 23.3 Structured outputs

Use JSON schema/validated structured output for:
- character autofill;
- memory extraction;
- story planning;
- dynamic state updates;
- moderation classification.

Do not parse arbitrary JSON using only a greedy regex like the current implementation.

Validate with Zod.

---

# 24. Memory Service Detailed Design

## 24.1 Types

- identity_fact;
- preference;
- relationship_event;
- promise;
- recurring_topic;
- sensitive_fact;
- temporary_context.

## 24.2 Sensitive memory

Do not automatically remember every sensitive disclosure.

Memory extractor classifies sensitivity.

User controls:
- “What do you remember about me?”;
- delete individual memory;
- clear memories;
- disable memory for a character.

## 24.3 Retrieval scoring

Illustrative:

```text
score =
  semantic_similarity * 0.50
+ importance * 0.25
+ recency_score * 0.15
+ relationship_relevance * 0.10
```

Weights admin/configurable.

## 24.4 Deduplication

If new memory is semantically duplicate:
- merge;
- update confidence/importance;
- preserve source references;
- do not create infinite duplicate rows.

---

# 25. Media Generation Pipeline

## 25.1 Image job

```text
API request
→ entitlement
→ public/private validation
→ prompt normalization
→ moderation
→ reserve credits
→ generation_jobs row
→ queue
→ provider
→ server downloads provider result
→ validate/re-encode
→ object storage
→ moderation
→ media_asset
→ usage event
→ credit reconciliation
→ client notification
```

Do not depend permanently on expiring provider URLs.

## 25.2 Public character selfie

Input:
- canonical visual identity;
- approved references;
- scene;
- outfit;
- camera style;
- emotion.

Output must maintain identity.

If quality/identity check fails:
- bounded retry;
- alternate route if allowed;
- no unbounded spend.

## 25.3 Video job

Async provider flow:
- submit;
- save provider job ID;
- poll with backoff;
- timeout/expiry;
- ingest result;
- transcode if needed;
- poster;
- filters;
- moderation;
- CDN.

## 25.4 Voice

TTS can be generated on demand and cached by:
- message text hash;
- voice profile/version;
- model.

Do not pay for the same audio on every playback.

---

# 26. Stories Scheduler

## 26.1 Scheduler behavior

Every 15 minutes:
- find due eligible characters;
- acquire row/advisory lock;
- verify owner/account;
- verify subscription;
- verify autonomy;
- verify budget;
- enqueue story planner.

## 26.2 Planner output

```json
{
  "storyType": "selfie",
  "caption": "Late coffee run ☕",
  "scenePrompt": "...",
  "mood": "relaxed",
  "estimatedCredits": 175,
  "fallback": "text"
}
```

## 26.3 Next schedule

After success:
- calculate randomized next timestamp inside cadence;
- persist `next_story_at` in autonomy state or dedicated scheduling table.

Avoid exact robotic periodicity.

---

# 27. Human Realtime Messaging

Use WebSockets for:
- new message;
- typing;
- read receipt;
- presence;
- reaction notification.

Scale later using Redis adapter.

Send flow:
1. client UUID;
2. optimistic UI;
3. server validate;
4. DB write;
5. ACK;
6. emit recipient.

Server is authoritative.

---

# 28. Search and Recommendation

## 28.1 MVP search

PostgreSQL:
- pg_trgm;
- full text;
- tags;
- city;
- category.

## 28.2 Discovery scoring

Initial score can combine:
- quality;
- engagement velocity;
- freshness;
- viewer interest similarity;
- language match;
- proximity bucket;
- report penalty;
- repetition penalty.

Never rank only by follower count.

## 28.3 Semantic recommendation later

- embed character profile;
- embed viewer interests;
- vector candidates;
- rerank.

---

# 29. Analytics Events

Track:
- app_open;
- install_prompt_shown;
- pwa_installed;
- signup_started;
- signup_completed;
- character_create_started;
- character_create_completed;
- public_character_published;
- character_followed;
- ai_chat_started;
- ai_message_sent;
- ai_response_completed;
- image_generation_started;
- image_generation_completed;
- video_generation_started;
- video_generation_completed;
- story_viewed;
- story_created;
- story_auto_published;
- subscription_started;
- subscription_cancelled;
- credit_pack_purchased;
- generation_failed.

Do not send private raw chat text to product analytics by default.

---

# 30. Observability

## 30.1 Logs

Structured JSON with:
- request_id;
- internal user id;
- job id;
- provider;
- model;
- latency;
- status;
- safe error code.

Never log:
- provider keys;
- passwords;
- access/refresh tokens;
- private media bytes;
- full payment details.

## 30.2 Metrics

- request latency;
- 5xx;
- queue depth;
- job duration;
- generation failure;
- model latency;
- model cost;
- cost/user;
- credits burn;
- DB pool;
- Redis;
- WebSocket connections;
- story scheduler delay.

## 30.3 Alerts

- provider error spike;
- spend spike;
- queue backlog;
- negative-wallet attempt;
- Stripe webhook failure;
- DB storage alert;
- media ingest failure;
- moderation backlog.

