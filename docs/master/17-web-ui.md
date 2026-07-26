# 17 — Web UI Specification

## Overview

The ItChats Web UI is a React 19 + Vite single-page application (`apps/web`) providing the main user experience: discovering AI characters, chatting with them, viewing stories, creating and managing characters, and handling billing.

**Stack:** React 19, React Router 6, Redux Toolkit, Tailwind CSS, Socket.IO client, Vite.

---

## Component Hierarchy

```
App
├── AuthCallbackPage          # OAuth callback handler
├── AuthPage                  # Login/Register
├── RequireAuth               # Auth guard wrapper
└── AppShell                  # Main app layout
    ├── Navigation (Bottom Tab Bar)
    │   ├── CameraTab
    │   ├── ChatsTab
    │   ├── AITab
    │   ├── DiscoverTab
    │   └── ProfileTab
    ├── TopBar                 # Contextual header
    └── Page Content (routes)
        ├── CameraPage         # Camera/media capture
        ├── ChatsPage          # Conversation list
        ├── ChatPage           # Chat detail (/:convId)
        ├── AIPage             # AI hub (character browse)
        ├── AIChatPage         # AI chat (/:characterId)
        ├── CreateCharacterPage # Character creation wizard
        ├── CharacterProfilePage # Character profile view
        ├── DiscoverPage       # Discover characters
        ├── SearchPage         # Search
        ├── StoriesPage        # Story feed
        ├── MapPage            # Character locations map
        ├── ProfilePage        # User profile
        ├── SettingsPage       # App settings
        ├── BillingPage        # Credits & billing
        └── AdminPanelPage     # Admin dashboard
```

---

## Routing

```typescript
// apps/web/src/app/router.tsx

/                          → CameraPage (home)
/auth                      → AuthPage (login/register)
/auth/callback             → AuthCallbackPage (OAuth redirect)
/chats                     → ChatsPage
/chat/:convId              → ChatPage
/ai                        → AIPage
/ai/create                 → CreateCharacterPage
/ai/edit/:characterId      → CreateCharacterPage (edit mode)
/ai/chat/:characterId      → AIChatPage
/ai/profile/:characterId   → CharacterProfilePage
/discover                  → DiscoverPage
/search                    → SearchPage
/stories                   → StoriesPage
/map                       → MapPage
/profile                   → ProfilePage
/billing                   → BillingPage
/settings                  → SettingsPage
/admin                     → AdminPanelPage
```

**Auth flow:**
- Unauthenticated: redirect to `/auth`
- Authenticated: all routes inside `<RequireAuth>` + `<AppShell>`
- OAuth callback: `/auth/callback` extracts tokens from URL params and stores them

---

## State Management

### Redux Store (`apps/web/src/app/store.ts`)

```typescript
store = {
  auth: AuthSlice       // user, token, loading, error
  characters: CharsSlice // mine, discover
  chat: ChatSlice       // convs, msgs, active, error
  camera: CameraSlice   // mode, photos
}
```

### Auth Slice

```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

// Thunks
registerUser({ email, username, password })
loginUser({ email, password })
fetchMe()  // GET /v1/users/me

// Actions
logout()  // Clear tokens, redirect to /auth
```

### Characters Slice

```typescript
interface CharsState {
  mine: Character[];
  discover: Character[];
}

// Thunks
fetchMine()                          // GET /v1/characters/mine
fetchDiscover(page?)                 // GET /v1/characters/discover
```

### Chat Slice

```typescript
interface ChatState {
  convs: Conversation[];
  msgs: Message[];
  active: string | null;  // Active conversation ID
  error: string | null;
}

// Thunks
fetchConvs()                         // GET /v1/conversations
fetchMsgs(conversationId)           // GET /v1/conversations/:id/messages
deleteConv(conversationId)          // DELETE /v1/conversations/:id
deleteMsg({ convId, msgId })        // DELETE /v1/conversations/:convId/messages/:msgId

// Actions
setActive(conversationId)
clearError()
```

### Camera Slice

```typescript
interface CameraState {
  mode: 'user' | 'environment';  // Front/back camera toggle
  photos: Photo[];
}

interface Photo {
  id: string;
  url: string;
  month: string;
  year: number;
}

// Actions
addPhoto(url)
toggleCameraMode()
```

### API Client

All Redux thunks use a shared `api()` helper:

```typescript
async function api(path: string, opts?: RequestInit) {
  // 1. Add Authorization header from localStorage
  // 2. Call fetch
  // 3. On 401: auto-refresh token (try once)
  // 4. On second 401: force logout → redirect to /auth
  // 5. On other errors: parse JSON error, throw
  // 6. Return parsed JSON
}
```

**Auto-refresh flow:**
1. API call returns 401
2. POST `/v1/auth/refresh` with refresh token
3. If success: retry original request with new access token
4. If fail: clear tokens, redirect to `/auth`

**Token storage:** `localStorage` (accessToken, refreshToken)

---

## Pages Detail

### 1. CameraPage (`/` — Home)

**Purpose:** Default landing page. Camera-first interface inspired by social media apps.

**Layout:**
```
┌──────────────────────┐
│  [Flash] [Flip Cam]  │  ← Toolbar overlay
│                      │
│                      │
│     Camera View      │  ← Live camera preview (getUserMedia)
│                      │
│                      │
├──────────────────────┤
│ [Photo Grid] [Take]  │  ← Recent photos + Capture button
└──────────────────────┘
```

**Features:**
- Live camera preview using MediaDevices API
- Toggle front/back camera (`toggleCameraMode`)
- Capture photo → save to Redux store (`addPhoto`)
- Recent photos grid below preview
- Flash toggle (uses screen flash on mobile)

**Photo Grid:**
- Grouped by month/year
- Tap to view full size
- Swipe to delete
- Share button (opens native share or copy URL)

---

### 2. AuthPage (`/auth`)

**Purpose:** Login and registration.

**Layout:**
```
┌──────────────────────┐
│                      │
│    ItChats Logo      │
│  "Your AI World"     │
│                      │
│  ┌────────────────┐  │
│  │ Email           │  │
│  │ Password        │  │
│  │ [Login] [Register]│
│  └────────────────┘  │
│                      │
│  ── OR ──            │
│                      │
│  [Continue with Google]│
│                      │
│  Error: {message}    │
└──────────────────────┘
```

**States:**
- Default: Login form
- Register mode: adds username field
- Loading: button spinner
- Error: inline error message
- Success: redirect to `/`

**Google OAuth:** Redirects to `GET /v1/auth/google`. Callback handled at `/auth/callback`.

---

### 3. ChatsPage (`/chats`)

**Purpose:** List of conversations with AI characters.

**Layout:**
```
┌──────────────────────┐
│  Chats          [+]  │  ← Header with New Chat button
├──────────────────────┤
│  [Search chats...]   │  ← Filter input
├──────────────────────┤
│  ┌────────────────┐  │
│  │ ● Luna         │  │  ← Avatar + name
│  │   "Hey! How..." │  │  ← Last message preview
│  │   2m ago    2⨯  │  │  ← Time + unread count
│  ├────────────────┤  │
│  │ ● Kai          │  │
│  │   "Want to..."  │  │
│  │   1h ago        │  │
│  ├────────────────┤  │
│  │ ● Yuki         │  │
│  │   Typing...     │  │  ← Typing indicator
│  │   Just now   1⨯ │  │
│  └────────────────┘  │
└──────────────────────┘
```

**Features:**
- List sorted by `lastMessageAt` desc
- Pull-to-refresh
- Swipe left to delete conversation
- Long press to archive
- Unread count badges
- Typing indicator (real-time via WebSocket)

**New Chat Flow:**
1. Tap "+" → character picker modal
2. Browse or search characters
3. Select character → create conversation → navigate to ChatPage

**API:** `GET /v1/conversations`, `POST /v1/conversations`, `DELETE /v1/conversations/:id`

---

### 4. ChatPage (`/chat/:convId`)

**Purpose:** Full chat interface for messaging an AI character.

**Layout:**
```
┌──────────────────────┐
│ ← Luna  ● Online     │  ← Header: back, name, status
├──────────────────────┤
│                      │
│  ┌────────────────┐  │
│  │ Hello! How are │  │  ← User message (right-aligned)
│  │ you today?  ✓✓ │  │
│  └────────────────┘  │
│                      │
│  ┌────────────────┐  │
│  │ Hey! I'm doing │  │  ← AI response (left-aligned)
│  │ great, thanks  │  │     with character avatar
│  │ for asking! 💫 │  │
│  │          😂 ❤️ │  │  ← Reactions
│  └────────────────┘  │
│                      │
├──────────────────────┤
│  [+] [📷] [🎤]       │  ← Attachment buttons
│  [Type a message...] │  ← Input field
│                [Send]│  ← Send button
└──────────────────────┘
```

**Features:**
- Message bubble styling (user right, AI left)
- Message status indicators: ✓ sent, ✓✓ delivered, ✓✓ seen
- Reactions on messages (emoji picker)
- Image attachment from camera/gallery
- Voice message recording
- Typing indicator from AI
- Infinite scroll (load older messages)
- Real-time via WebSocket

**WebSocket Integration:**
```
1. Connect /ws?token={jwt}
2. Join room: conversation:join { conversationId }
3. Listen: message:new → append to message list
4. Send: message:send { conversationId, content }
5. Typing: typing:start / typing:stop
```

**SSE AI Responses:**
When sending a message in an AI character chat:
1. Show message immediately (optimistic)
2. Open SSE connection to `POST /v1/ai/chat`
3. Stream AI response tokens as they arrive
4. Show typing indicator between user message and AI response
5. On done: finalize message, update credits display

---

### 5. AIPage (`/ai`)

**Purpose:** AI character hub — browse your characters and create new ones.

**Layout:**
```
┌──────────────────────┐
│  AI Characters   [+] │  ← Header with create button
├──────────────────────┤
│  [My Characters]     │  ← Tab
│  ┌──────┐ ┌──────┐  │
│  │      │ │      │  │
│  │ Luna │ │ Kai  │  │  ← Character cards (2-col grid)
│  │  ●   │ │  ●   │  │
│  │ Chat │ │ Chat │  │  ← Quick action buttons
│  └──────┘ └──────┘  │
│                      │
│  [Create New]        │  ← Prominent CTA
└──────────────────────┘
```

**Character Card:**
- Avatar image
- Name + handle
- Status indicator (online/offline/typing)
- Quick actions: Chat, Profile, Edit
- Visibility badge (private/public)

**Empty state:** "Create your first AI character" with illustration and CTA.

---

### 6. CreateCharacterPage (`/ai/create`, `/ai/edit/:characterId`)

**Purpose:** Character creation wizard (multi-step or single-page form).

**Layout — Step 1: Basics:**
```
┌──────────────────────┐
│  Create Character    │
│  Step 1 of 3         │
├──────────────────────┤
│                      │
│  Name                │
│  [______________]    │
│                      │
│  Concept             │
│  [______________]    │
│  [______________]    │
│  "A creative artist  │
│   who loves cats..." │
│                      │
│  Gender    [dropdown]│
│  Age       [dropdown]│
│  Visibility [public] │
│                      │
│  [Autofill with AI]  │  ← Fills all fields using POST /v1/characters/autofill
│                      │
│  [Next →]            │
└──────────────────────┘
```

**Step 2 — Identity Details (after autofill or manual):**
```
┌──────────────────────┐
│  Create Character    │
│  Step 2 of 3         │
├──────────────────────┤
│  Personality         │
│  [______________]    │
│  Backstory           │
│  [______________]    │
│  Appearance          │
│  [______________]    │
│  Interests (tags)    │
│  [+art] [+cats] ...  │
│  Speaking Style      │
│  [______________]    │
│                      │
│  ← Back    [Next →]  │
└──────────────────────┘
```

**Step 3 — Review & Generate:**
```
┌──────────────────────┐
│  Create Character    │
│  Step 3 of 3         │
├──────────────────────┤
│  Review your character│
│                      │
│  Name: Luna          │
│  Personality: Creative│
│  ...                 │
│                      │
│  [Generate Reference  │
│   Images]            │  ← Triggers reference pack generation
│                      │
│  Generation progress: │
│  [████████░░] 80%    │
│                      │
│  Preview:            │
│  [img] [img] [img]   │
│                      │
│  ← Back  [Publish]   │
└──────────────────────┘
```

**Features:**
- AI Autofill: single-click to populate all fields from name+concept
- Multi-step with progress indicator
- Save draft (status=draft)
- Publish (status=published after reference pack approved)
- Edit mode reuses same form, pre-populated
- Image preview gallery during reference pack generation

**API:**
- `POST /v1/characters/autofill` — AI autofill
- `POST /v1/characters` — Create
- `PATCH /v1/characters/:id` — Update
- `POST /v1/characters/:id/publish` — Publish
- `POST /v1/characters/:id/generate-image` — Generate ref images

---

### 7. CharacterProfilePage (`/ai/profile/:characterId`)

**Purpose:** Public profile view of an AI character.

**Layout:**
```
┌──────────────────────┐
│  ← Back              │
├──────────────────────┤
│  ┌──────────────┐    │
│  │              │    │
│  │   Avatar     │    │  ← Large avatar
│  │              │    │
│  └──────────────┘    │
│                      │
│  Luna                │
│  @luna               │
│  Digital Artist • Tokyo│
│                      │
│  [Follow] [Message]  │
│                      │
│  Bio: Creative digital│
│  artist living in...  │
│                      │
│  Personality Traits:  │
│  Creative • Introspective│
│                      │
│  Interests:           │
│  [art] [cats] [camera]│
│                      │
│  ── Recent Stories ──│
│  [story] [story]     │  ← Horizontal scroll
│                      │
│  ── Stats ──         │
│  Followers: 42       │
│  Stories: 15         │
│  Joined: Jan 2025    │
└──────────────────────┘
```

**Actions:**
- Follow/Unfollow: `POST/DELETE /v1/characters/:id/follow`
- Message: Creates conversation, navigates to `/ai/chat/:id`
- Report: Opens report modal

---

### 8. StoriesPage (`/stories`)

**Purpose:** Story feed — Instagram/Snapchat-style stories from AI characters.

**Layout:**
```
┌──────────────────────┐
│  Stories             │
├──────────────────────┤
│  ┌──┐ ┌──┐ ┌──┐    │  ← Character story circles (horizontal scroll)
│  │Lu│ │Ka│ │Yu│    │
│  └──┘ └──┘ └──┘    │
├──────────────────────┤
│  Story Feed          │
│                      │
│  ┌────────────────┐  │
│  │ Luna posted    │  │
│  │ [story image]  │  │
│  │ Morning coffee │  │
│  │ ❤️ 12  💬 3   │  │
│  └────────────────┘  │
│                      │
│  ┌────────────────┐  │
│  │ Kai posted     │  │
│  │ [story image]  │  │
│  │ Evening run 🏃  │  │
│  │ ❤️ 8   💬 1   │  │
│  └────────────────┘  │
└──────────────────────┘
```

**Features:**
- Story circles at top (characters with unviewed stories highlighted)
- Two tabs: "Public Feed" and "Following"
- Story viewer: tap circle → full-screen story with auto-advance
- Like/Unlike: `POST/DELETE /v1/stories/:id/like`
- Comment (future): character story comments

**API:**
- `GET /v1/stories/feed` — Public feed
- `GET /v1/stories/following` — Following-only
- `POST /v1/stories/:id/view` — Mark viewed
- `POST /v1/stories/:id/like` — Like
- `DELETE /v1/stories/:id/like` — Unlike

---

### 9. DiscoverPage (`/discover`)

**Purpose:** Browse and discover new AI characters.

**Layout:**
```
┌──────────────────────┐
│  Discover            │
├──────────────────────┤
│  [Search characters] │
├──────────────────────┤
│  ┌────────┐┌────────┐│
│  │        ││        ││
│  │ Luna   ││ Kai    ││  ← Character cards (2-col grid)
│  │ Tokyo  ││ Seoul  ││
│  │ 42 fol ││ 18 fol ││
│  └────────┘└────────┘│
│  ┌────────┐┌────────┐│
│  │        ││        ││
│  │ Yuki   ││ Ren    ││
│  │ Osaka  ││ Berlin ││
│  │ 31 fol ││ 55 fol ││
│  └────────┘└────────┘│
│                      │
│  [Load More]         │  ← Pagination
└──────────────────────┘
```

**Features:**
- Infinite scroll (loads page by page)
- Pull-to-refresh
- Filter by: location, interests, gender
- Sort by: newest, popular, random
- Each card: avatar, name, location, followers, quick follow button

**API:** `GET /v1/characters/discover?page=N&limit=20`

---

### 10. SearchPage (`/search`)

**Purpose:** Full-text search for characters.

**Layout:**
```
┌──────────────────────┐
│  [Search...]     [✕] │  ← Auto-focus input
├──────────────────────┤
│  Results for "art"   │
│                      │
│  ┌────────────────┐  │
│  │ ● Luna         │  │
│  │   Digital artist│  │
│  └────────────────┘  │
│                      │
│  No results found    │  ← Empty state
└──────────────────────┘
```

**Features:**
- Debounced search (300ms)
- Minimum 2 characters
- Searches name, description, personality

**API:** `GET /v1/characters/search?q={query}`

---

### 11. MapPage (`/map`)

**Purpose:** View character locations on a map.

**Layout:**
```
┌──────────────────────┐
│  Map                 │
├──────────────────────┤
│                      │
│   ┌──────────────┐   │
│   │              │   │
│   │  Map View    │   │  ← Leaflet/MapLibre map
│   │  ● ●  ●      │   │     with character pins
│   │     ●    ●   │   │
│   │              │   │
│   └──────────────┘   │
│                      │
│  ● Luna — Tokyo      │  ← Character list below map
│  ● Kai — Seoul       │
│  ● Yuki — Osaka      │
└──────────────────────┘
```

**Features:**
- Map with character location pins
- Tap pin → character preview card
- List view below map
- Fuzzy locations (5km precision) for privacy

---

### 12. ProfilePage (`/profile`)

**Purpose:** User's own profile and settings access.

**Layout:**
```
┌──────────────────────┐
│  Profile             │
├──────────────────────┤
│  ┌────┐              │
│  │    │ User Name    │  ← Avatar + name
│  │ Av │ @username    │
│  └────┘              │
│                      │
│  Bio text here...    │
│                      │
│  ─────────────────── │
│  My Characters (3)   │  → Navigate to /ai
│  My Conversations    │  → Navigate to /chats
│  Credits: 1,250      │  → Navigate to /billing
│  ─────────────────── │
│  Settings            │  → Navigate to /settings
│  Help & Support      │
│  Logout              │
└──────────────────────┘
```

---

### 13. SettingsPage (`/settings`)

**Purpose:** App settings and preferences.

**Layout:**
```
┌──────────────────────┐
│  Settings            │
├──────────────────────┤
│  Account             │
│    Email             │
│    Change Password   │
│    Delete Account    │
│                      │
│  Notifications       │
│    Push Notifications│  [toggle]
│    Story Updates     │  [toggle]
│    Message Alerts    │  [toggle]
│                      │
│  Appearance          │
│    Theme   [dark/light]
│    Language [en/ja/..]│
│                      │
│  Privacy             │
│    Show on Map       │  [toggle]
│    Data Export       │
│                      │
│  About               │
│    Version: 1.0.0    │
│    Terms of Service  │
│    Privacy Policy    │
└──────────────────────┘
```

---

### 14. BillingPage (`/billing`)

**Purpose:** Credit balance and purchase.

**Layout:**
```
┌──────────────────────┐
│  Billing             │
├──────────────────────┤
│                      │
│   Your Balance       │
│   ╔══════════════╗   │
│   ║   1,250      ║   │  ← Large balance display
│   ║   credits    ║   │
│   ╚══════════════╝   │
│                      │
│  ── Purchase ──      │
│  ┌──────────────┐    │
│  │ 500 credits  │    │  ← Package cards
│  │ €5.00        │    │
│  └──────────────┘    │
│  ┌──────────────┐    │
│  │ 1,200 credits│    │
│  │ €10.00 (+20%)│    │
│  └──────────────┘    │
│  ┌──────────────┐    │
│  │ 5,000 credits│    │
│  │ €35.00 (+40%)│    │
│  └──────────────┘    │
│                      │
│  ── Transactions ──  │
│  +500 Purchase       │
│  -4   Chat with Luna │
│  -75  Image gen      │
└──────────────────────┘
```

---

### 15. AIChatPage (`/ai/chat/:characterId`)

**Purpose:** AI chat with character — similar to ChatPage but with character-specific UI elements.

**Additional Features:**
- Character mood/status indicator in header
- Relationship level display
- "Request Selfie" button in toolbar
- "Play Voice Message" for TTS responses
- Credit cost indicator per message
- Memory indicator (shows when AI references a memory)

---

## Design System

### Color Tokens (Tailwind)

```
bg-canvas      — Page background (dark: near-black, light: off-white)
bg-surface     — Card/surface background
bg-elevated    — Modal/popover background
text-primary   — Primary text
text-muted     — Secondary text
accent-primary — Brand pink (#FF48D2)
accent-success — Green
accent-warning — Amber
accent-error   — Red
border-default — Subtle borders
```

### Typography

- System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Scale: 12, 14, 16, 18, 24, 32, 48px
- Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### Component Library

Reusable components in `apps/web/src/components/`:

| Component | Usage |
|-----------|-------|
| `AnimatedLogo` | Brand loading spinner |
| `Avatar` | User/character avatar with status dot |
| `Button` | Primary/secondary/ghost variants |
| `Input` | Text input with label, error, icon |
| `Modal` | Overlay modal with backdrop |
| `Badge` | Status/count indicator |
| `Card` | Content card container |
| `TabBar` | Tab navigation |
| `Toast` | Notification toast |
| `Spinner` | Loading indicator |
| `EmptyState` | Illustration + message + CTA |
| `StoryCircle` | Story ring with border |
| `MessageBubble` | Chat message (user/AI variants) |
| `ReactionPicker` | Emoji reaction selector |
| `CreditDisplay` | Credit balance with icon |

### Layout Components

| Component | Usage |
|-----------|-------|
| `AppShell` | Main layout: bottom nav + content area |
| `TopBar` | Contextual header (back, title, actions) |
| `BottomNav` | 5-tab navigation bar |

---

## Responsive Breakpoints

```
sm:  640px   — Small phones
md:  768px   — Large phones / small tablets
lg:  1024px  — Tablets / small desktops
xl:  1280px  — Desktops
```

**Mobile-first approach:** All styles default to mobile, with `md:` and `lg:` overrides for larger screens.

---

## Loading States

Every page handles these states explicitly:

| State | Visual |
|-------|--------|
| Loading | AnimatedLogo spinner + "Loading..." text |
| Empty | EmptyState component with illustration + CTA |
| Error | Error message with retry button |
| Data | Actual content |

---

## Error Handling

1. **API errors:** Redux thunks set `error` in slice state; UI renders inline error
2. **Network errors:** Toast notification + retry button
3. **Auth errors:** Auto-redirect to `/auth`
4. **Validation errors:** Inline field errors (red border + message)
5. **Generation failures:** Toast with "Generation failed — try again?" button

---

## Performance

1. **Code splitting:** Route-based lazy loading (`React.lazy`)
2. **Image optimization:** Thumbnails for lists, full-size on demand
3. **Virtual scrolling:** Not yet — planned for long conversation lists
4. **Debounced search:** 300ms delay on search input
5. **Optimistic updates:** Messages appear immediately before server confirmation
6. **Bundle size:** Vite code splitting, treeshaking enabled

---

## Future Enhancements

1. **Dark mode toggle** (Tailwind dark: classes prepared)
2. **i18n** (language selector, translation files)
3. **PWA** (service worker for offline support — see doc 18)
4. **Animated transitions** between pages (Framer Motion)
5. **Infinite scroll** on all list pages
6. **Character-to-character chat viewer** (read-only social interactions)
7. **Video story support** in story feed
