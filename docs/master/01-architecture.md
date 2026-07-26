# 01 — Architecture Overview

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | ≥22 |
| Package Manager | pnpm | ≥9 |
| Monorepo | Turborepo | 2.x |
| Backend Framework | NestJS | 11.x |
| Database ORM | Drizzle ORM | latest |
| Database | PostgreSQL | 16+ |
| Frontend | React + Vite | 19.x |
| State | Redux Toolkit | latest |
| Real-time | Socket.IO | latest |
| AI Provider | Alibaba DashScope | — |
| Queue | In-process (future: BullMQ/Redis) | — |
| Caching | In-memory Map (future: Redis) | — |

## Repository Structure

```
itchats-ai/
├── apps/
│   ├── api/           # NestJS backend — REST + WebSocket
│   ├── web/           # React frontend (Vite)
│   ├── worker/        # Background job worker
│   └── admin/         # Admin dashboard (built separately)
├── packages/
│   ├── database/      # Drizzle schemas, migrations, DB client
│   ├── ai-core/       # AI provider clients, prompts, costing
│   ├── contracts/     # Shared TypeScript types + Zod schemas
│   ├── config/        # Environment configuration
│   ├── ui/            # Shared React components
│   └── validation/    # Zod validation utilities
├── infra/
│   └── nginx/         # Nginx configuration
├── docs/
│   └── master/        # THIS documentation set
└── ecosystem.config.cjs  # PM2 process management
```

## Data Flow

```
User (WebSocket/REST)
    │
    ▼
┌──────────────────────────────────────┐
│            apps/api                   │
│  ┌──────────┐  ┌──────────────────┐  │
│  │ Chat     │  │ Character        │  │
│  │ Gateway  │  │ Creation Service │  │
│  └────┬─────┘  └────────┬─────────┘  │
│       │                 │             │
│  ┌────▼─────────────────▼──────────┐  │
│  │         AiService               │  │
│  │  ┌──────────┐ ┌──────────────┐  │  │
│  │  │ Context  │ │ Memory       │  │  │
│  │  │ Builder  │ │ Service      │  │  │
│  │  └──────────┘ └──────────────┘  │  │
│  └──────────────┬──────────────────┘  │
│                 │                     │
│  ┌──────────────▼──────────────────┐  │
│  │    packages/ai-core             │  │
│  │  ┌──────────┐ ┌──────────────┐  │  │
│  │  │ Alibaba  │ │ Costing      │  │  │
│  │  │ Provider │ │ Engine       │  │  │
│  │  └────┬─────┘ └──────────────┘  │  │
│  └───────┼─────────────────────────┘  │
└──────────┼────────────────────────────┘
           │
           ▼
    Alibaba DashScope API
    (Chat / Image / TTS / ASR / Video / Embed)
```

## Module Dependency Graph

```
apps/api
  ├── AiModule
  │   ├── AiService (streamChat, generateImage, generateVoice, etc.)
  │   ├── ContextBuilderService (system prompts, relationship context)
  │   └── MemoryService (store, retrieve, scored ranking)
  ├── CharactersModule
  │   ├── CharactersService (CRUD)
  │   └── CharacterCreationService (autofill, image gen, publish)
  ├── ConversationsModule
  │   └── ChatGateway (WebSocket real-time messaging)
  ├── StoriesModule
  │   ├── StoriesService
  │   └── StorySchedulerService (autonomous story generation)
  ├── SocialModule
  │   ├── Follows, Likes, Comments, Blocks, Reports
  │   └── Notifications
  ├── BillingModule / TreasuryModule
  │   └── Credit wallets, journaling, margin policies
  ├── UsersModule
  │   └── Auth (JWT + Google OAuth)
  └── AdminModule
      └── Finance, Moderation, Analytics
```

## Key Architectural Decisions

1. **Monorepo with Turborepo** — shared packages, single build pipeline
2. **Drizzle ORM over Prisma** — lighter, SQL-like, better for complex queries
3. **Alibaba DashScope as primary AI provider** — cost-effective with fallback chains
4. **Credits-based billing** — prepaid credits with margin protection
5. **In-process scheduling** (setInterval) — adequate for current scale; migrate to BullMQ when needed
6. **WebSocket for real-time** — Socket.IO with JWT auth, room-based messaging
7. **No pgvector yet** — text-based memory retrieval with scored ranking; embeddings planned

## Environment Configuration

```
# .env (secrets only)
ALIBABA_API_KEY=sk-...
JWT_SECRET=...
DATABASE_URL=postgres://...

# packages/config — typed config
getConfig() → { ALIBABA_API_KEY, JWT_SECRET, DATABASE_URL, ... }
```
