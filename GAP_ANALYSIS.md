# ItChats AI — Gap Analysis & Implementation Roadmap

> Generated 2026-07-24 | Comparing original prompt vision vs current codebase state

---

## 🔴 CRITICAL: Security Issue

**API key is hardcoded in `src/utils/ai/alibaba.ts` line 1-3:**
```
const ALIBABA_API_KEY = process.env.REACT_APP_ALIBABA_API_KEY || 'sk-ws-H.XLIIHH...';
```
This key is exposed in the git repo and frontend bundle. **Rotate immediately.** All API calls must go through a backend proxy — never expose keys client-side.

---

## 📊 Current State Summary

### ✅ What's Already Built (AI Characters)

| Feature | Status | Notes |
|---|---|---|
| Create character (name, personality, desc, backstory, age, gender) | ✅ Done | `AICreate.tsx` |
| Upload avatar or use initial placeholder | ✅ Done | FileReader base64 |
| LLM auto-fill character fields from hints | ✅ Done | `generateCharacterSuggestions()` |
| Character list with search | ✅ Done | `AICharacters.tsx` |
| Delete characters | ✅ Done | With confirmation dialog |
| Chat with AI characters (text) | ✅ Done | `AIChat.tsx` |
| Relationship meter (1-10 hearts) | ✅ Done | Visual only, increments 0.1/msg |
| Chat history (localStorage) | ✅ Done | Per-character |
| Character memories (localStorage) | ✅ Done | Data model exists, not used in prompts |
| "Clear chat" keeps character memory | ✅ Done | Intentional behavior |
| Characters respond in user's language | ✅ Done | Prompt rule #2 |
| No conversation restrictions | ✅ Done | Prompt rule #9 |
| Emotions tracking | ✅ Done | Array of strings |
| System prompt builds character persona | ✅ Done | `buildCharacterPrompt()` |
| LLM model fallback routing | ✅ Done | Basic — tries next model on failure |
| Text-to-image generation | ✅ Done | For avatar only, not in-chat |
| Image-to-image editing | ✅ Done | `editImage()` exists, unused in UI |
| TTS (text-to-speech) | ✅ Done | `textToSpeech()` exists, unused in UI |

### ✅ Original Snapchat Clone Features (Kept)

| Feature | Status |
|---|---|
| Camera with AR filters | ✅ Working |
| Snap Map | ✅ Working |
| Discover feed | ✅ Working |
| Search | ✅ Working |
| Archive | ✅ Working |
| Chat (non-AI, dummy) | ✅ Working |

---

## 🎨 GAP 7: UI/UX Complete Overhaul — AI-First Redesign

### 7.1 Design Philosophy
**"AI is not a feature — it's the core."** The app is being restructured so AI Character
chats are a first-class tab, separate from legacy Snapchat-style friend chats. Every pixel,
color, and interaction should communicate: intelligent, warm, premium, and human-like.

### 7.2 New Information Architecture

```
┌──────────────────────────────────────────┐
│  Toolbar (time, signal, battery)         │
├──────────────────────────────────────────┤
│                                          │
│  Header (dynamic per tab)                │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  Main Content Area                       │
│  (Camera / AI Hub / Chat / Discover)     │
│                                          │
│                                          │
├──────────────────────────────────────────┤
│  Tab Bar (5 tabs, fixed bottom)          │
│  📷 Camera │ 💬 Chats │ 🤖 AI │ 🧭 Map │ 👤 Profile │
└──────────────────────────────────────────┘
```

### 7.3 Tab Definitions

| Tab | Icon | Route | Content |
|---|---|---|---|
| **Camera** | `faCamera` | `/` | AR filters, photo capture, snap-style |
| **Chats** | `faCommentAlt` | `/chats` | Friend conversations (legacy) |
| **AI** ⭐ | `faRobot` (branded) | `/ai` | AI Character hub — MY characters, DISCOVER public, CREATE |
| **Map** | `faMapMarkerAlt` | `/map` | Snap Map / location features |
| **Profile** | `faUserCircle` | `/account` | User settings, account, logout |

### 7.4 AI Tab — Sub-Screens

```
AI Tab (/ai)
├── My Characters (default — grid of user's characters)
│   ├── Tap character → AI Chat (/ai/chat/:id)
│   ├── Long-press → Quick actions (delete, edit, view memories)
│   └── Empty state → "Create your first AI character"
├── Discover (swipe/tab — public characters)
│   ├── Search bar
│   ├── Category filters (Romantic, Friend, Mentor, Fantasy, etc.)
│   ├── Character cards with popularity rating
│   └── "Clone to my characters" button
├── Create (+ FAB button)
│   ├── Quick create (name + hints → LLM fills rest)
│   ├── Advanced create (manual fields)
│   ├── Avatar: Upload OR AI generate from description
│   └── Privacy toggle: Private / Public
└── AI Chat (/ai/chat/:id) — full screen overlay
    ├── Chat header (avatar, name, relationship hearts, menu)
    ├── Message list (text, image, voice bubbles)
    ├── Typing indicator
    ├── Input bar (text, voice record, image request)
    ├── Ephemeral: messages clear on back navigation
    └── Character memory persists
```

### 7.5 New Design System — "ItChats AI"

#### Color Palette
```scss
// === Primary Brand ===
$color-primary: #7C3AED;           // Deep violet — AI, intelligence
$color-primary-light: #A78BFA;     // Soft lavender
$color-primary-dark: #5B21B6;      // Deep purple
$color-primary-gradient: linear-gradient(135deg, #7C3AED, #A78BFA);

// === Accent ===
$color-accent: #00E5FF;            // Electric cyan — tech, AI glow
$color-accent-warm: #FF6B6B;       // Coral — human warmth, emotions

// === Background ===
$color-bg-primary: #0A0A1A;        // Deep dark blue-black
$color-bg-secondary: #12122A;      // Card surfaces
$color-bg-tertiary: #1A1A3E;       // Elevated surfaces
$color-bg-input: #1E1E40;          // Input fields

// === Text ===
$color-text-primary: #F0F0FF;      // White with slight blue tint
$color-text-secondary: #9898B8;    // Muted lavender-gray
$color-text-tertiary: #6B6B8A;     // Subtle

// === Semantic ===
$color-success: #10B981;           // Emerald
$color-warning: #F59E0B;           // Amber
$color-error: #EF4444;             // Red
$color-info: #3B82F6;              // Blue

// === Relationship Scale (hearts meter) ===
$color-relation-1: #6B6B8A;        // Stranger (gray)
$color-relation-2: #A78BFA;        // Acquaintance (lavender)
$color-relation-3: #FF6B6B;        // Friend (coral)
$color-relation-4: #FF3B8B;        // Close (hot pink)
$color-relation-5: #FF006E;        // Intimate (deep pink)
```

#### Typography
```scss
$font-family: 'Plus Jakarta Sans', 'Work Sans', sans-serif;
$font-mono: 'JetBrains Mono', monospace;

// Scale
$text-xs: 0.75rem;    // 12px — badges, captions
$text-sm: 0.875rem;   // 14px — body, timestamps
$text-base: 1rem;     // 16px — messages
$text-lg: 1.125rem;   // 18px — subtitles
$text-xl: 1.25rem;    // 20px — card titles
$text-2xl: 1.5rem;    // 24px — section headers
$text-3xl: 2rem;      // 32px — page titles
$text-4xl: 2.5rem;    // 40px — hero
```

#### Spacing & Sizing
```scss
$space-xs: 4px;
$space-sm: 8px;
$space-md: 16px;
$space-lg: 24px;
$space-xl: 32px;
$space-2xl: 48px;

$radius-sm: 8px;
$radius-md: 12px;
$radius-lg: 16px;
$radius-xl: 24px;
$radius-full: 9999px;
```

#### Shadows & Effects
```scss
// Glow effects for AI elements
$glow-primary: 0 0 20px rgba(124, 58, 237, 0.3);
$glow-accent: 0 0 15px rgba(0, 229, 255, 0.3);
$glow-text: 0 0 10px rgba(167, 139, 250, 0.5);

// Glass morphism for cards
$glass-bg: rgba(26, 26, 62, 0.6);
$glass-border: rgba(255, 255, 255, 0.08);
$glass-blur: blur(16px);
```

### 7.6 Component Redesigns

#### Tab Bar (replaces Footer)
- Glass-morphism background (blur + semi-transparent)
- 5 equal-width tab items
- Active tab: primary color glow + icon fill
- Inactive: muted tertiary color
- Center "AI" tab slightly larger with gradient glow ring
- Height: 64px + safe area padding
- z-index: 100

#### Character Card (AI Characters list)
- Glass card with subtle gradient border
- AI-generated avatar (or initial + gradient bg)
- Name + short description
- Relationship heart meter (mini)
- Last message preview
- Online indicator dot (green glow)
- Emotion tag chips
- Hover/tap: subtle scale + glow intensify

#### AI Chat Screen
- Dark gradient background
- Message bubbles:
  - User: primary gradient, right-aligned, rounded corners
  - Character: glass card, left-aligned, avatar thumbnail
  - Image messages: rounded card with tap-to-expand
  - Voice messages: waveform visualizer + play button
- Input bar: glass container with rounded pill input
- Voice record button with pulsing red ring
- Typing indicator: animated dots + "character is typing..."
- Ephemeral banner at top: "Messages disappear when you leave"
- Relationship meter as horizontal progress bar at top

#### Character Creation
- Step-by-step wizard OR single scrollable form
- AI auto-fill: type name → loading shimmer → fields populate
- Avatar section: Upload button OR "Generate with AI" button
- Live preview card showing how character will appear
- Privacy toggle with explanation
- Emotion/personality tag selector (chips)

### 7.7 Navigation Flow

```
Launch App
  │
  ├─ First time → Onboarding (3 screens) → AI Tab
  │
  └─ Returning → Last active tab
       │
       ├─ Camera Tab → AR view → Capture → Share/Save
       ├─ Chats Tab → Friend list → Chat drawer (overlay)
       ├─ AI Tab → My Characters → AI Chat (full screen)
       │          ├─ Swipe right → Discover public chars
       │          └─ + FAB → Create character
       ├─ Map Tab → Snap Map view
       └─ Profile Tab → Account settings
```

### 7.8 Motion & Micro-interactions

- Tab transitions: 200ms ease-out slide
- Character cards: staggered fade-in on mount (50ms delay each)
- AI chat messages: appear with slide-up + fade (like iMessage)
- Typing indicator: 3 bouncing dots with staggered animation
- Heart meter: particles burst on level-up
- Create character: form fields animate in with spring
- Tab bar: active indicator slides between tabs (fluid)
- Image generation: shimmer skeleton → fade-in reveal
- Button press: scale(0.95) with spring-back

### 7.9 Design Tokens Implementation

All design tokens will live in `src/styles/_vars.scss` as CSS custom properties
and SCSS variables for maximum flexibility. The system supports:

- [x] Light/Dark mode (default dark)
- [x] Responsive scaling (mobile-first, max-width: 414px)
- [x] Accessibility (minimum contrast ratios, focus rings)
- [x] Safe area insets for notched devices

---

## 📋 Implementation Phases (Updated)

### Phase 1: Design System & Rebrand (Current)
1. ✅ Create new color palette & design tokens
2. ✅ Rebuild `_vars.scss` with ItChats design system
3. ✅ Redesign Tab Bar (replace Footer)
4. ✅ New global styles (dark theme, typography)
5. ✅ Replace Snapchat yellow/ghost branding everywhere
6. ✅ New app layout with separate AI tab

### Phase 2: AI-Centric Screens (Next)
7. Redesigned AI Characters grid (glass cards, animations)
8. Redesigned AI Chat (ephemeral, image generation, voice)
9. Character Creation wizard (AI auto-fill, preview)
10. Public character Discover page
11. AI Stories feed

### Phase 3: Backend Foundation
12. User auth & JWT
13. Database & API proxy
14. Multi-tenant isolation

### Phase 4: Monetization & Launch
15. Stripe subscriptions
16. Admin panel
17. Landing page + SEO
18. PWA + notifications

---

## 🔴 GAP 1: Multi-Tenant SaaS Architecture

**Current:** No auth. No user accounts. Single localStorage. Everything is local to one browser.

**Needed:**
- [ ] User registration/login (email/password + OAuth Google/Apple)
- [ ] JWT-based auth with refresh tokens
- [ ] Tenant isolation — each user has their own characters, chats, settings
- [ ] Subscription management (Stripe/Paddle integration)
- [ ] Usage tracking per user (API call counting per model)
- [ ] Rate limiting per subscription tier
- [ ] User profile management
- [ ] Password reset flow
- [ ] Email verification

---

## 🔴 GAP 2: Backend & Database

**Current:** No backend. All data in localStorage. API calls go directly from browser to Alibaba Cloud.

**Needed:**
- [ ] Backend API server (Node.js/Express or Python/FastAPI recommended)
- [ ] Database schema (PostgreSQL recommended):
  - `users` — id, email, password_hash, subscription_tier, created_at, etc.
  - `characters` — id, user_id, name, personality, description, backstory, age, gender, avatar_url, is_public, is_ai_generated_avatar, created_at
  - `chat_messages` — id, character_id, user_id, sender, content, type (text/image/voice), image_url, created_at
  - `character_memories` — id, character_id, content, importance, created_at
  - `subscriptions` — id, user_id, plan, status, stripe_id, current_period_end
  - `api_usage` — id, user_id, model, tokens_in, tokens_out, cost, created_at
  - `public_characters` — id, creator_id, name, personality, description, backstory, age, gender, avatar_url (text-to-image only), approved, created_at
  - `admin_users` — id, email, password_hash, role, created_at
- [ ] API proxy for all Alibaba Cloud calls (never expose API key to client)
- [ ] File storage for avatars and generated images (S3/Cloudflare R2)
- [ ] Redis for session management and rate limiting
- [ ] Database migrations system

---

## 🔴 GAP 3: AI Features Not Implemented

### 3a. Characters Sending Images
**Prompt says:** "characters are able to send image whether text to image... or image to image for example they use the reference picture to send selfies"

**Current:** Chat is text-only. The `[IMAGE: description]` rule exists in the prompt but is NOT parsed/handled.

**Needed:**
- [ ] Parse `[IMAGE: description]` in LLM responses
- [ ] Auto-trigger text-to-image when character "sends" an image
- [ ] Show generated image in chat bubble
- [ ] Characters send "selfies" using image-to-image on their reference avatar
- [ ] Loading state while image generates
- [ ] Retry on model failure with next model

### 3b. Chat Ephemerality (Snapchat-style)
**Prompt says:** "if I leave the chat the chat and images delete"

**Current:** Chat is persisted to localStorage. Clear is manual.

**Needed:**
- [ ] Auto-delete chat messages when user navigates away from chat
- [ ] Keep character memories (as specified)
- [ ] Option to save specific messages before leaving
- [ ] Visual indicator that chat is ephemeral

### 3c. Voice Messages
**Prompt says:** "voice messages"

**Current:** TTS function exists but no UI. No STT for voice input.

**Needed:**
- [ ] Record voice messages (MediaRecorder API)
- [ ] STT transcription via Alibaba Cloud (`qwen3-asr-flash`)
- [ ] TTS playback of character responses (`qwen3-tts-flash`)
- [ ] Voice note UI (waveform, play/pause)
- [ ] Auto-play toggle

### 3d. AI-Generated Stories
**Prompt says:** "AI need to understand how the whole app work, so for example they can once a day or something create a story, and in the story they should use effects"

**Current:** Not implemented at all.

**Needed:**
- [ ] Daily story generation by characters
- [ ] Stories use AR filters/effects from the camera feature
- [ ] Text-to-video for story clips (using wan2.x models)
- [ ] Story feed UI (like Snapchat Stories)
- [ ] Auto-expire after 24 hours
- [ ] Character decides story content based on personality + relationship

### 3e. Active Memory System
**Current:** Memories stored but never fed back into LLM context.

**Needed:**
- [ ] Inject relevant memories into system prompt
- [ ] Auto-extract important facts from conversations
- [ ] Memory importance scoring
- [ ] Memory decay over time
- [ ] "What do you remember about me?" command

---

## 🔴 GAP 4: Public vs Private Characters

**Prompt says:** "users then will be able to create public characters or private characters. public characters cannot use real images as references, it have to be text to image."

**Current:** All characters are private. No sharing.

**Needed:**
- [ ] Toggle public/private on character creation
- [ ] Public character approval queue (admin panel)
- [ ] Public character browse/discover page
- [ ] Public characters: force text-to-image avatar (no uploads)
- [ ] Private characters: allow real image uploads
- [ ] Character popularity/rating system
- [ ] "Clone" public character to your private list

---

## 🔴 GAP 5: Admin Panel

**Prompt says:** "create admin panel where i control users, public characters,..etc"

**Current:** No admin system.

**Needed:**
- [ ] Admin login (separate from user auth)
- [ ] Dashboard: total users, active chats, API usage, revenue
- [ ] User management: list, search, ban, delete, view details
- [ ] Public character approval queue
- [ ] Reported content moderation
- [ ] API usage analytics per model
- [ ] Subscription management
- [ ] System health monitoring
- [ ] Global settings (rate limits, model availability)

---

## 🔴 GAP 6: Landing Page & Marketing Site

**Prompt says:** "create landing page, all faq and seo and policies,..etc and make it ready to be sold to public"

**Current:** No landing page. App is a single-page React app.

**Needed:**
- [ ] Separate landing page (Next.js or static site recommended)
- [ ] Hero section with value proposition
- [ ] Features showcase
- [ ] Pricing page (3 tiers: Free/Pro/Unlimited)
- [ ] FAQ section
- [ ] Privacy Policy
- [ ] Terms of Service
- [ ] Cookie Policy
- [ ] SEO optimization (meta tags, sitemap, structured data)
- [ ] Blog/content section
- [ ] Contact/support page
- [ ] Authentication pages (login, register, reset password)
- [ ] Demo/try-it section
- [ ] Social proof (testimonials, stats)

---

## 🔴 GAP 7: Branding & Design System

**Prompt says:** "rebrand to something different, name it itChats, create suitable branding, coloring, logo, icons,..etc"

**Current:** Still using Snapchat's yellow/black color scheme, ghost logo, Snapchat branding remnants.

**Needed:**
- [ ] New color palette (suggestion: deep purple/indigo + warm gradients for AI feel)
- [ ] New logo (ghost replaced with AI-themed icon)
- [ ] Typography system (already has Work Sans — keep or upgrade to Inter/Plus Jakarta Sans)
- [ ] Icon set (replace FontAwesome Snapchat references)
- [ ] Design tokens (CSS variables for colors, spacing, shadows, radii)
- [ ] Dark mode support
- [ ] Brand guidelines document

---

## 🔴 GAP 8: Pricing & Monetization

**Prompt says:** "pricing after understanding pricing of alibaba cloud models, adding my margin on top"

**Alibaba Cloud Model Pricing (approximate, verify with current docs):**

| Category | Model | Input Price (per 1M tokens) | Output Price |
|---|---|---|---|
| LLM Flash | qwen3.5-flash | ~$0.07 | ~$0.14 |
| LLM Flash | qwen3.6-flash | ~$0.07 | ~$0.14 |
| LLM Flash | deepseek-v4-flash | ~$0.14 | ~$0.28 |
| Text-to-Image | wan2.2-t2i-plus | ~$0.02/image | — |
| Text-to-Image | qwen-image-2.0 | ~$0.01/image | — |
| Image-to-Image | qwen-image-edit-plus | ~$0.02/image | — |
| TTS | qwen3-tts-flash | ~$0.002/1K chars | — |
| STT | qwen3-asr-flash | ~$0.002/min | — |
| Video | wan2.7-t2v | ~$0.10/video | — |

**Suggested Pricing Tiers:**

| Tier | Price/mo | Chats/day | Images/day | Voice | Characters | AI Stories |
|---|---|---|---|---|---|---|
| **Free** | $0 | 20 | 5 | 2 min | 3 private | ❌ |
| **Pro** | $9.99 | 200 | 50 | 30 min | 15 private + public | 1/day |
| **Unlimited** | $24.99 | ∞ | 200 | 120 min | ∞ | 3/day |

**Margin target:** 60-70% after Alibaba costs. At $9.99/mo, estimated Alibaba cost ~$2-3/mo per active user.

**Needed:**
- [ ] Stripe integration for payments
- [ ] Subscription tier enforcement
- [ ] Usage tracking and quota enforcement
- [ ] Upgrade/downgrade flows
- [ ] Free trial (7 days Pro)
- [ ] Invoice generation

---

## 🟡 GAP 9: Model Routing Optimization

**Current:** Basic array iteration. Tries models in order, stops at first success.

**Model Selection Recommendations:**

### LLM (Chat — flash/fast only):
```
Primary: qwen3.5-flash (fastest, cheap)
Fallback 1: qwen3.6-flash
Fallback 2: deepseek-v4-flash
Fallback 3: qwen-flash
Fallback 4: qwen3.5-35b-a3b (slightly heavier but still fast)
```

### Text-to-Image:
```
Portrait/Avatar: qwen-image-2.0-pro-2026-06-22 (best quality portraits)
General: wan2.2-t2i-plus (good balance)
Fast/Cheap: wan2.2-t2i-flash
Fallback: qwen-image-2.0
High quality: wan2.7-image-pro
```

### Image-to-Image (Selfies):
```
Primary: qwen-image-edit-plus-2025-10-30 (best face editing)
Fallback 1: qwen-image-edit-plus
Fallback 2: qwen-image-edit-max-2026-01-16
Fallback 3: wan2.5-i2i-preview
```

### TTS (Text-to-Speech):
```
Primary: qwen3-tts-flash (fast)
Fallback 1: cosyvoice-v3-flash (natural voice)
Fallback 2: qwen3-tts-flash-2025-09-18
```

### STT (Speech-to-Text):
```
Primary: qwen3-asr-flash
Fallback 1: fun-asr-flash-2026-06-15
Fallback 2: qwen3-asr-flash-realtime
```

### Text-to-Video (for AI Stories):
```
Primary: wan2.7-t2v-2026-06-12
Fallback 1: wan2.7-t2v
Fallback 2: wan2.6-t2v
```

**Needed:**
- [ ] Smart routing with health checks
- [ ] Model latency tracking (prefer faster models)
- [ ] Cost tracking per model
- [ ] Automatic model deprecation handling (models expire!)

---

## 🟡 GAP 10: UI/UX Improvements

**Current:** Functional but Snapchat-themed. Missing key flows.

**Needed:**
- [ ] Character "selfie" generation button in chat
- [ ] Relationship level affects conversation depth (actually enforced by LLM, not just display)
- [ ] Emotions update dynamically based on conversation
- [ ] Typing indicators with variable delay (simulate human typing speed)
- [ ] Read receipts
- [ ] "Last active" timestamps
- [ ] Push notifications (web push API)
- [ ] PWA manifest for installable app
- [ ] Offline mode indicator
- [ ] Loading skeletons everywhere

---

## 🟢 GAP 11: Technical Infrastructure

**Needed:**
- [ ] Move API key to backend environment variables
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Docker containerization
- [ ] Monitoring (error tracking — Sentry)
- [ ] Logging (structured logs)
- [ ] Automated backups
- [ ] Load testing before launch
- [ ] SSL/HTTPS enforcement
- [ ] CSP headers
- [ ] Rate limiting at API gateway level

---

## 📋 Implementation Phases (Recommended Order)

### Phase 1: Foundation (Week 1-2)
1. Rotate API key immediately
2. Set up backend (Node.js/FastAPI + PostgreSQL + Redis)
3. Build API proxy for Alibaba Cloud
4. User auth system (JWT)
5. Database schema + migrations
6. Move all localStorage logic to database

### Phase 2: Core AI Features (Week 3-4)
7. Image generation in chat (character "sends" images)
8. Voice messages (STT + TTS)
9. Active memory system
10. Chat ephemerality (auto-delete on leave)
11. Dynamic emotions and relationship enforcement

### Phase 3: Multi-Tenant & Monetization (Week 5-6)
12. Subscription tiers + Stripe
13. Usage tracking + quota enforcement
14. Public vs private characters
15. Character discovery page
16. Admin panel

### Phase 4: Rebrand & Launch Prep (Week 7-8)
17. Full rebrand (colors, logo, design system)
18. Landing page + SEO + policies
19. AI Stories feature
20. PWA + push notifications
21. Testing + bug fixes
22. Launch

---

## 🚨 Immediate Actions (Do This Now)

1. **ROTATE THE API KEY** — The key `sk-ws-H.XLIIHH...` is committed to the repo and visible in the frontend bundle. Log into Alibaba Cloud console, revoke it, generate a new one, and NEVER put it in frontend code.

2. **Add `.env` to `.gitignore`** — Verify it's there.

3. **Remove `build/` folder from git** — Built assets with embedded API key are committed.

4. **Create a `.env.example`** with placeholder values.

---

## 📁 File Structure for New Backend

```
itchats-ai/
├── client/              # Current React app (moved)
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── characters.ts
│   │   │   ├── chat.ts
│   │   │   ├── images.ts
│   │   │   ├── admin.ts
│   │   │   └── billing.ts
│   │   ├── services/
│   │   │   ├── alibaba.ts        # API proxy
│   │   │   ├── llm.ts
│   │   │   ├── image-gen.ts
│   │   │   ├── tts.ts
│   │   │   └── stripe.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── rateLimit.ts
│   │   │   └── quota.ts
│   │   ├── db/
│   │   │   ├── schema.sql
│   │   │   └── migrations/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── landing/             # Landing page (Next.js)
├── .env.example
└── docker-compose.yml
```

---

## 📊 Cost Estimation (Monthly, at 1,000 active users)

| Resource | Est. Cost |
|---|---|
| Alibaba Cloud API (avg Pro user: $2-3) | $2,500 |
| PostgreSQL (Railway/Supabase) | $25 |
| Redis (Upstash) | $10 |
| File storage (R2/S3) | $15 |
| Server hosting (Railway/Fly.io) | $50 |
| Stripe fees (2.9% + $0.30) | ~$300 |
| Domain + Email | $20 |
| **Total** | **~$2,920** |

**Revenue at 1,000 users (10% conversion to Pro):**
- 100 Pro × $9.99 = $999
- 50 Unlimited × $24.99 = $1,249
- **Total: ~$2,248/mo** (not yet profitable at this scale)

**Break-even:** ~1,300 users at same conversion rate.

---
