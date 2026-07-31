# itChats — Full Product Fix & Upgrade Execution Plan

> Repository: `waelosamahelmi/itchats`  
> Target branch: `main`  
> Purpose: Direct implementation specification for an AI coding agent.  
> Rule: Do not redesign requirements. Implement exactly what is described, preserve existing working functionality, and add tests for every persistence bug.

---

# 1. Global Execution Rules

## 1.1 Engineering rules

1. Do not keep important state only in React component state.
2. Any state that must survive refresh must come from the backend.
3. Every optimistic UI mutation must:
   - update immediately,
   - roll back on API failure,
   - reconcile with the server response.
4. Do not use placeholder counts, placeholder profile images, placeholder star scores, or fake following state.
5. Avoid direct array mutation outside Redux Toolkit reducers.
6. Add loading, success, empty, and error states for all API-driven screens.
7. Menus, sheets, reactions, and share dialogs must render through portals or a top-level overlay container.
8. Do not schedule important delayed AI jobs with plain `setTimeout`.
9. Use durable jobs such as BullMQ/Redis or a database-backed job table.
10. Never silently swallow production errors. Log structured errors and return meaningful API messages.
11. Mobile-first behavior is the primary target.
12. All touch targets must be at least 44×44 pixels.
13. All user-generated or AI-generated social data must persist across refresh and relaunch.
14. Add database constraints for uniqueness and consistency where needed.
15. Add tests before marking any phase complete.

---

# 2. Recommended Implementation Order

Implement in this order:

1. Persistence and correctness foundation.
2. Feed and social interactions.
3. Stories.
4. Discover and follow system.
5. Chat list and chat header persistence.
6. Relationship engine.
7. Voice messages and media intelligence.
8. User profile.
9. Notifications and PWA push.
10. Sessions and cookies.
11. Subscription and pricing review.
12. Full UI/UX polish.
13. SEO and social embeds.
14. Final regression and E2E testing.

---

# 3. Feed Layout and Horizontal Overflow

## Problem

The feed can scroll horizontally. The application should only scroll vertically.

## Files to inspect

- `apps/web/src/features/feed/FeedPage.tsx`
- `apps/web/src/app/AppShell.tsx`
- global CSS files under `apps/web/src`
- shared UI package styles
- any container using:
  - `w-screen`
  - fixed widths
  - negative margins
  - translated elements
  - large absolute-positioned dropdowns

## Required changes

1. Add a global guard:

```css
html,
body,
#root {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
}
```

2. Use:

```css
min-width: 0;
max-width: 100%;
```

on flex children containing posts, text, media, and menus.

3. Replace dangerous `w-screen` usage inside nested layouts with `w-full`.

4. Ensure images, video, link cards, text, and reposts use:

```css
max-width: 100%;
overflow-wrap: anywhere;
```

5. Add an E2E test checking:

```js
document.documentElement.scrollWidth === document.documentElement.clientWidth
```

on mobile breakpoints.

## Acceptance criteria

- No horizontal page scroll at 320px, 375px, 390px, 414px, and tablet widths.
- Long URLs and long unbroken strings do not create horizontal overflow.
- Menus and share sheets do not change page width.

---

# 4. Stories System

## Problems

- “Your Story” does not create a story.
- All characters are shown in the story row even if they have no active story.
- Current story lifetime is inconsistent with the desired product behavior.
- Stories should remain active for 3 days to reduce unnecessary generation credit usage.

## Required behavior

1. “Your Story” must open a story composer.
2. User can create:
   - image story,
   - video story,
   - text story,
   - optional caption.
3. Story row displays only authors with at least one non-expired story.
4. Story expiration must be 72 hours.
5. Viewed state must persist.
6. Story ordering:
   - unviewed first,
   - newest active story first.
7. AI characters without active stories must not appear.

## Backend changes

Inspect:

- `apps/api/src/stories/*`
- `packages/database/src/schema/stories.ts`
- story scheduler and generation services

Add or verify fields:

```ts
expiresAt
createdAt
viewedAt
mediaType
mediaUrl
caption
authorUserId
authorCharacterId
```

When creating a story:

```ts
expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)
```

All active-story queries must include:

```sql
WHERE deleted_at IS NULL
  AND expires_at > NOW()
```

Add indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_stories_active_user
ON stories(author_user_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_stories_active_character
ON stories(author_character_id, expires_at DESC);
```

## Frontend changes

In the feed:

- render “Your Story” first,
- render grouped active stories after it,
- do not build the row from the complete character list,
- load from a dedicated active-story API endpoint.

## Acceptance criteria

- Creating a story works.
- Refresh does not remove it.
- Expired stories disappear automatically.
- Only characters with active stories appear.
- Story remains available for exactly 72 hours unless deleted.

---

# 5. Post Composer

## 5.1 Missing user avatar

### Problem

The composer shows a gray circle instead of the logged-in user’s profile image.

### Required changes

- Use the authenticated user profile source.
- Do not depend on a stale local placeholder.
- Add a fallback generated avatar only when `avatarUrl` is empty.
- Re-sync after profile image update.

Likely files:

- `apps/web/src/features/feed/FeedPage.tsx`
- `apps/web/src/app/store.ts`
- profile/auth slices

---

## 5.2 Intelligent mention autocomplete

### Desired behavior

Typing `@` opens a character suggestion list.

Examples:

- `@` → show available characters.
- `@a` → filter handles/names beginning with `a`.
- `@as` → narrow further.
- selecting a result inserts the correct handle into the text.
- keyboard navigation must work.
- touch selection must work.
- mentions must support Unicode names and handles.

### Backend

Create or improve:

```http
GET /v1/characters/mention-search?q=<query>&limit=10
```

Return:

```ts
{
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  visibility: 'public' | 'private';
}
```

Authorization rules:

- public characters are searchable,
- user-owned private characters are searchable by that owner,
- other users’ private characters are never returned.

Use database filtering instead of downloading 200 characters.

Recommended query:

```sql
WHERE deleted_at IS NULL
AND (
  visibility = 'public'
  OR owner_user_id = :currentUserId
)
AND (
  LOWER(handle) LIKE LOWER(:prefix || '%')
  OR LOWER(name) LIKE LOWER(:prefix || '%')
)
ORDER BY
  CASE WHEN LOWER(handle) = LOWER(:prefix) THEN 0 ELSE 1 END,
  follower_count DESC NULLS LAST,
  name ASC
LIMIT 10;
```

Add indexes on normalized handle/name.

### Frontend

Create a reusable `MentionAutocomplete` component.

It must:

- inspect the current caret position,
- detect the active `@query`,
- debounce API calls,
- render an anchored dropdown through a portal,
- replace only the active mention token,
- preserve cursor position,
- close on Escape, blur, selection, or invalid token.

Remove the separate mention button if manual `@` typing fully replaces it.

---

## 5.3 Hashtags

### Required behavior

- Typing `#topic` creates a hashtag token.
- Hashtags are clickable.
- Hashtag pages show relevant posts.
- Future feed ranking can use user interests and hashtag affinity.

### Database

Create:

```sql
hashtags
- id
- normalized_name UNIQUE
- display_name
- usage_count
- created_at

post_hashtags
- post_id
- hashtag_id
- created_at
PRIMARY KEY (post_id, hashtag_id)
```

### Backend

On post create/edit:

1. Parse hashtags.
2. Normalize with Unicode support.
3. Upsert hashtag.
4. Replace post_hashtags transactionally.
5. Update usage counts safely.

Add:

```http
GET /v1/hashtags/:name/posts
GET /v1/hashtags/trending
```

### Frontend

- render hashtags as links,
- add hashtag search,
- preserve hashtags in translation and truncation rendering.

---

## 5.4 Feeling picker redesign

### Problem

The current feeling UI looks unpolished and AI-generated.

### Required redesign

Use a bottom sheet on mobile and popover on desktop.

Categories:

- Happy
- Excited
- Grateful
- Relaxed
- Sad
- Angry
- Tired
- Celebrating
- Traveling
- Watching
- Listening
- Eating

Each item:

- icon/emoji,
- localized label,
- selected state,
- remove option.

Do not use a cramped floating grid.

---

## 5.5 Link embeds in posts

### Desired behavior

Pasting a URL should generate a Facebook-like preview.

### Backend

Create:

```http
POST /v1/link-preview
```

Input:

```json
{ "url": "https://example.com" }
```

Output:

```ts
{
  url: string;
  canonicalUrl?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  faviconUrl?: string;
}
```

Security requirements:

- block private IP ranges,
- block localhost,
- block non-http protocols,
- use timeout,
- cap response size,
- prevent SSRF redirects,
- cache results,
- sanitize metadata.

Add post fields or a separate table:

```sql
post_link_previews
- post_id UNIQUE
- url
- canonical_url
- title
- description
- image_url
- site_name
- favicon_url
- created_at
```

Frontend:

- detect pasted URLs,
- debounce preview generation,
- show loading skeleton,
- allow removing the preview,
- preserve preview after refresh.

---

## 5.6 Image upload validation

Verify:

- image picker opens,
- upload succeeds,
- preview is shown,
- retry works,
- uploaded image persists after refresh,
- unsupported file types are rejected,
- large images are resized/compressed,
- orientation is corrected,
- upload progress is visible.

---

# 6. Post Reactions and Persistence

## Problems

- Likes disappear after refresh.
- “NaN” appears beside likes.
- AI characters do not like each other’s posts.
- Comment reactions disappear after refresh.
- Current Redux reducer always increments and does not properly toggle.

## Required backend model

Ensure unique reactions:

```sql
UNIQUE (post_id, user_id)
UNIQUE (post_id, character_id)
```

Equivalent constraints for comment reactions.

Reaction endpoint should be idempotent and return authoritative state.

Recommended API:

```http
PUT /v1/posts/:postId/reaction
DELETE /v1/posts/:postId/reaction
```

Response:

```ts
{
  postId: string;
  viewerReaction: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry' | 'care' | null;
  reactionCount: number;
  reactions: Array<{ type: string; count: number }>;
}
```

Use a database transaction.

Never calculate frontend state from stale assumptions.

## Frontend changes

In `apps/web/src/app/store.ts`:

- replace “always increment” logic,
- store `viewerReaction`,
- replace reaction summary with the server response,
- support change reaction,
- support remove reaction,
- roll back on failure.

Normalize counts:

```ts
const safeCount = Number.isFinite(Number(value)) ? Number(value) : 0;
```

Never render `NaN`.

## AI reactions

Move AI social reactions to durable jobs.

Create job types:

- `post-ai-reaction`
- `post-ai-comment`
- `mention-ai-reply`
- `comment-ai-reply`
- `ai-to-ai-reply`

Do not rely on process-local `setTimeout`.

AI characters should:

- react to followed users,
- react to mutual/friend users,
- react to other relevant AI characters,
- sometimes comment,
- reply contextually,
- avoid repetitive behavior,
- obey rate limits,
- obey relationship context.

## Acceptance criteria

- Like survives refresh.
- Removing like survives refresh.
- Changing reaction survives refresh.
- Counts never show NaN.
- AI-created reactions are visible from another session.
- Comment reactions persist.

---

# 7. Comments and Replies

## Problems

- Character does not reply to the user.
- Reply button does nothing.
- Comment reactions do not persist.
- Discussion is not interactive enough.

## Required comment model

Verify:

```sql
post_comments
- id
- post_id
- parent_comment_id
- user_id
- character_id
- content
- is_ai_generated
- created_at
- updated_at
- deleted_at
```

Add indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_post_comments_post
ON post_comments(post_id, created_at);

CREATE INDEX IF NOT EXISTS idx_post_comments_parent
ON post_comments(parent_comment_id, created_at);
```

## Reply UI

Clicking Reply must:

1. set active parent comment,
2. display “Replying to <name>”,
3. focus the input,
4. send `parentCommentId`,
5. insert reply under the correct comment,
6. persist after refresh,
7. allow canceling reply mode.

## Character reply engine

When a user comments on a character’s post:

- enqueue a reply job,
- load post content,
- load parent comment,
- load nearby comments,
- load user-character relationship,
- load character identity and recent memory,
- decide whether to reply,
- avoid duplicate reply,
- delay naturally,
- persist reply,
- generate notification.

When a user replies directly to a character comment:

- increase reply probability,
- reply to the correct nested thread.

## Prompt requirements

The prompt must include:

- character identity,
- personality,
- speaking style,
- mood,
- relationship status,
- post content,
- current thread,
- recent discussion,
- safety boundaries,
- response-length limit,
- instruction not to repeat generic phrases.

Output should use schema validation, not raw `JSON.parse` only.

Use a structured output validator with retries.

---

# 8. Post Menus and Share UI

## Problems

- Three-dot menus are too transparent.
- Text behind the menu makes it unreadable.
- Menus are clipped inside post cards.
- Share sheet appears inside the post instead of over the application.

## Required changes

1. Render menus through `createPortal(document.body)`.
2. Use a top-level overlay:
   - fixed positioning,
   - high z-index,
   - opaque/elevated background,
   - shadow,
   - backdrop where appropriate.
3. Mobile share UI should be a bottom sheet.
4. Desktop can use a popover/dialog.
5. Do not mount overlays inside elements with:
   - `overflow-hidden`,
   - transforms,
   - isolation contexts,
   - low stacking contexts.

Recommended layers:

```css
--z-content: 1;
--z-sticky: 20;
--z-dropdown: 1000;
--z-modal-backdrop: 1100;
--z-modal: 1200;
--z-toast: 1300;
```

## Acceptance criteria

- Menus remain fully visible.
- Menu text is readable.
- No clipping by cards or chat containers.
- Share dialog covers the page correctly.

---

# 9. Social Sharing and SEO

## Desired behavior

A copied post URL shared on Facebook or other platforms must have:

- title,
- description,
- image,
- canonical URL,
- Open Graph tags,
- Twitter card tags.

## Required architecture

Client-only Vite rendering is not enough for social crawlers.

Implement one of:

1. Server-side rendered public post route, or
2. Backend HTML metadata endpoint for crawlers, or
3. Edge/server prerendering.

Recommended public route:

```text
/p/:postId
```

Backend fetches post and returns HTML containing:

```html
<meta property="og:type" content="article">
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:image" content="...">
<meta property="og:url" content="...">
<meta name="twitter:card" content="summary_large_image">
```

## Share image

Generate a durable social-card image for posts without media.

Create a render endpoint or worker that produces:

- author avatar,
- author name,
- post excerpt,
- brand styling,
- optional character badge.

Store the generated image in object storage.

Do not rely on browser screenshots at share time.

---

# 10. Feed Ranking

## Desired behavior

The feed should show posts from followed characters only, including private characters owned by the user and public followed characters.

## Backend query

The feed must include:

- the user’s own posts,
- posts from followed characters,
- optional repost dependencies,
- active visibility rules.

It must not include all public characters by default.

Conceptual SQL:

```sql
SELECT p.*
FROM posts p
WHERE p.deleted_at IS NULL
AND (
  p.author_user_id = :userId
  OR p.author_character_id IN (
    SELECT character_id
    FROM character_follows
    WHERE user_id = :userId
  )
)
ORDER BY p.created_at DESC;
```

Later ranking may include:

- relationship strength,
- freshness,
- hashtag interest,
- engagement,
- diversity,
- unseen content.

Start with correctness before algorithmic ranking.

---

# 11. Discover Page

## Desired layout

Two sections:

1. Private
   - only characters owned by the current user,
   - invisible to other users.

2. Public
   - all published public characters,
   - searchable and followable.

## Current known bug

`DiscoverPage.tsx` uses local component state:

```ts
const [following, setFollowing] = useState(false);
```

This resets after refresh.

The backend discover response also uses mismatched field names:

- backend: `followerCount`, `characterScore`
- frontend expects: `followersCount`, `score`

## Required changes

### Character API response

Return:

```ts
{
  id,
  name,
  handle,
  avatarUrl,
  description,
  mood,
  followersCount,
  score,
  gender,
  ageDisplay,
  visibility,
  status,
  interests,
  ownerUserId,
  isFollowing
}
```

`isFollowing` must be calculated using the authenticated viewer.

### Frontend state

Add:

```ts
isFollowing?: boolean
```

to `Character`.

Do not initialize follow state to false.

Use backend state.

Optimistic follow flow:

1. store previous value,
2. update immediately,
3. dispatch API,
4. rollback on error,
5. use authoritative returned count.

### Star badge

Define exactly what the star means.

Recommended meaning:

- character reputation/score.

If score is unavailable:

- hide the badge,
- do not show `—`.

Add tooltip/info affordance.

### Private/public layout

Load both:

```http
GET /v1/characters/mine
GET /v1/characters/discover
```

Then render separate sections.

---

# 12. Character Profile Posts

## Requirement

Posts on a character profile must use the same post card component and the same behavior as feed posts.

Do not maintain two divergent post implementations.

Extract reusable components:

- `PostCard`
- `PostContent`
- `PostActions`
- `CommentThread`
- `ReactionPicker`
- `PostMenu`
- `ShareSheet`
- `MentionText`
- `LinkPreviewCard`

Character profile and feed must share them.

---

# 13. Chat List

## Required chat-row design

Each conversation row must show:

- character avatar,
- character name,
- last message,
- timestamp,
- unread count,
- delivery/read state for outgoing messages,
- mute indicator,
- three-dot menu.

Delivery states:

- sending,
- sent,
- delivered,
- read,
- failed.

Use one check for sent/delivered and two checks for read, if that visual language is chosen consistently.

## Backend

Conversation list endpoint should return a complete projection:

```ts
{
  conversationId,
  character: {
    id,
    name,
    avatarUrl
  },
  lastMessage: {
    id,
    content,
    senderType,
    createdAt,
    deliveryStatus,
    readAt
  },
  unreadCount,
  mutedUntil,
  updatedAt
}
```

Do not assemble critical row metadata from temporary Redux character lists.

---

# 14. Chat Menus and Header Persistence

## Problems

- Conversation menus are clipped.
- Header menu appears behind the conversation.
- Character name/avatar disappear after refresh.

## Root cause

`AIChatPage.tsx` currently finds the character from:

```ts
[...state.characters.mine, ...state.characters.discover]
```

Those arrays may be empty after direct page load.

## Required fix

When opening `/ai/chat/:characterId`:

1. fetch character detail directly:
   ```http
   GET /v1/characters/:characterId
   ```
2. store it as `currentCharacter`,
3. use it for name/avatar/header,
4. do not depend on Discover having been opened first.

Load chat bootstrap in parallel:

```ts
Promise.all([
  fetchCharacter(characterId),
  fetchHistory(characterId),
  fetchRelationship(characterId),
  fetchConversationSettings(characterId)
])
```

Menus must use portals.

---

# 15. Relationship System

## Desired behavior

Relationship progress changes intelligently based on:

- message content,
- tone,
- respect,
- affection,
- hostility,
- trust,
- repetition,
- boundaries,
- current relationship stage,
- recent history.

It should not move too fast or too slowly.

## Header UI

Show:

- relationship label,
- circular progress ring,
- optional mood indicator.

Example labels:

1. Stranger
2. New connection
3. Acquaintance
4. Friend
5. Close friend
6. Best friend
7. Romantic interest
8. Partner
9. Soulmate

Do not expose raw hidden values unless intended.

## Backend model

Maintain dimensions such as:

- familiarity,
- trust,
- warmth,
- affinity,
- tension,
- respect,
- attraction where allowed,
- boundary state.

Each message evaluation should output bounded deltas:

```ts
{
  familiarityDelta,
  trustDelta,
  warmthDelta,
  affinityDelta,
  tensionDelta,
  reasonCodes
}
```

Use:

- min/max clamps,
- cooldowns,
- diminishing returns,
- stage-dependent scaling,
- abuse penalties,
- repetition detection.

Never allow a single normal message to jump several relationship stages.

## Prompting

The response prompt should include the relationship stage and speaking constraints.

Examples:

- strangers should be more reserved,
- friends can be casual,
- close friends can reference memories,
- characters should enforce boundaries,
- hostile messages should affect tone and relationship.

Add unit tests for relationship presets and deltas.

---

# 16. AI Conversation Quality

## Required prompt stack

Build prompts in layers:

1. System safety and platform rules.
2. Character immutable identity.
3. Character current state.
4. Relationship context.
5. Relevant memories.
6. Current conversation mode.
7. Recent messages.
8. User message.
9. Output schema.

## Avoid

- generic assistant wording,
- repetitive selfies,
- repeating the same emotional phrase,
- instant extreme intimacy,
- ignoring relationship status,
- pretending every request is appropriate,
- breaking identity consistency.

## Structured output

Use a validated schema such as:

```ts
{
  parts: Array<
    | { type: 'speech'; content: string }
    | { type: 'action'; content: string }
    | { type: 'thought'; content: string }
    | { type: 'image_request'; prompt: string; framing: string }
    | { type: 'video_request'; prompt: string; durationSeconds: number }
  >;
  emotion: string;
  relationshipSignals: string[];
}
```

Retry invalid structured output once with a repair prompt.

---

# 17. Intelligent Image and Video Generation

## Current problem

Character sends selfies even when the request asks for another type of image.

## Required media-intent classifier

Classify user request into:

- selfie,
- full-body portrait,
- outfit photo,
- environment photo,
- activity photo,
- object/detail photo,
- candid scene,
- group scene,
- video request,
- refusal/no media.

Then generate using:

- character reference pack,
- identity consistency,
- conversation context,
- requested framing,
- clothing,
- location,
- lighting,
- pose,
- safety constraints.

## Important rule

Do not default every image request to selfie.

Examples:

- “Show me your outfit” → full-body or three-quarter image.
- “Send a picture of the beach you’re at” → environmental image.
- “Send a video” → video generation flow if supported.
- inappropriate request → character-based boundary/refusal.

## Video

Add a proper capability path:

```ts
mediaIntent = 'video'
```

If no video provider is configured:

- return a clear product-safe response,
- do not fake a sent video,
- optionally offer an image alternative in-character.

---

# 18. Voice Messages

## Current problems

- Sending voice note fails.
- Playback fails.
- Character does not respond afterward.

## Files to inspect

- `apps/web/src/features/ai/AIChatPage.tsx`
- media upload endpoints
- media service
- ASR endpoint
- object-storage configuration
- CORS configuration
- audio MIME handling

## Known risky flow

Current flow:

1. request upload URL,
2. PUT audio,
3. confirm upload,
4. convert same blob to base64,
5. ASR,
6. trigger AI response.

Likely failure areas:

- unsupported MIME type,
- presigned upload Content-Type mismatch,
- CORS,
- missing public/playback URL,
- upload confirmation not awaited correctly,
- media asset response missing URL,
- browser cannot play stored format,
- ASR rejects webm/opus,
- object URL is only local and disappears after refresh.

## Required redesign

Backend should accept multipart voice upload directly unless presigned upload is necessary.

Recommended:

```http
POST /v1/media/voice-notes
Content-Type: multipart/form-data
```

Response:

```ts
{
  mediaAssetId,
  playbackUrl,
  durationMs,
  mimeType,
  transcription
}
```

Then create a real message record with:

```ts
kind: 'voice_note'
mediaAssetId
mediaUrl
transcription
durationMs
```

The message must persist before triggering the AI reply.

## Playback

Use a shared audio player.

Support:

- play/pause,
- progress,
- duration,
- loading,
- failed state,
- one audio playing at a time.

Convert unsupported input formats server-side if necessary.

## Tests

- Chrome Android recording.
- Safari iOS recording.
- webm/opus.
- mp4/aac.
- refresh and playback.
- failed upload retry.
- AI response after transcription.

---

# 19. User Profile

## Required features

1. Upload/change profile image.
2. Upload/change cover image.
3. Edit display name, bio, location, website.
4. Create a post from profile.
5. Display profile posts using shared PostCard.
6. Friends/following/followers navigation.
7. Persist all edits.

## Social model decision

The requested direction is to merge follower/friend concepts.

Recommended MVP:

- following a character creates a connection,
- label user-facing section “Friends” for AI relationships,
- keep technical follow records internally,
- expose:
  - Friends,
  - Characters,
  - Posts.

If user-to-user following is later supported, keep it separate from character friendship.

---

# 20. Settings

## Requirement

Do not show non-functional settings as if they work.

For each setting:

- implement it,
- mark it “Coming soon,” or
- hide it.

Remove/hide email notifications until configured.

Settings needing real persistence:

- language,
- theme,
- auto-translate,
- push notifications,
- muted conversations,
- privacy,
- content preferences,
- account deletion,
- logout all sessions.

---

# 21. Sessions and Cookies

## Problems

- Session may disconnect.
- Direct refresh loses important state.
- PWA/mobile experience needs durable authentication.

## Required architecture

Prefer:

- short-lived access token,
- rotating refresh token,
- secure HttpOnly cookie for refresh token,
- SameSite configuration,
- secure flag in production,
- token reuse detection,
- session table.

Suggested table:

```sql
user_sessions
- id
- user_id
- refresh_token_hash
- device_name
- user_agent
- ip_hash
- created_at
- last_used_at
- expires_at
- revoked_at
```

## Frontend

`apiFetch` should:

1. attempt request,
2. on 401 call refresh once,
3. retry original request,
4. avoid parallel refresh storms with a shared promise,
5. logout only if refresh fails.

Do not clear the session on a single temporary API failure.

Persist only non-sensitive profile cache locally.

---

# 22. Mobile-First UX

## Required improvements

- Pull-to-refresh on feed, discover, notifications, and chats.
- Preserve scroll position when navigating back.
- Bottom navigation with clear active states.
- Safe-area handling.
- Bottom sheets instead of tiny floating popovers.
- Skeleton loaders.
- Native-feeling transitions.
- Haptic feedback where available for reactions and successful actions.
- Swipe actions only when discoverable and accessible.
- Large composer controls.
- Avoid excessive glassmorphism and transparency.
- Consistent spacing and typography.
- Proper empty states.

## Bottom navigation redesign

Recommended tabs:

- Home
- Discover
- Create
- Chats
- Profile

Notifications can be in the top bar with badge.

The current navigation should be redesigned to feel deliberate, not generated.

---

# 23. Notifications

## Required notification events

- mention,
- character reply,
- comment reply,
- post reaction,
- comment reaction,
- new follower/friend connection,
- story interaction,
- incoming message,
- relationship milestone,
- subscription/billing event,
- moderation event.

## Notification model

```sql
notifications
- id
- user_id
- type
- actor_user_id
- actor_character_id
- entity_type
- entity_id
- title
- body
- data_json
- read_at
- created_at
```

Add indexes:

```sql
(user_id, created_at DESC)
(user_id, read_at, created_at DESC)
```

Support:

- mark one read,
- mark all read,
- pagination,
- unread count,
- deep linking.

---

# 24. PWA Push Notifications

## Required behavior

Push notifications should work while the installed PWA is closed.

Implement:

- Web Push subscription,
- VAPID keys,
- service worker push event,
- notification click deep link,
- subscription refresh,
- user opt-in,
- per-conversation mute.

Tables:

```sql
push_subscriptions
- id
- user_id
- endpoint UNIQUE
- p256dh
- auth
- user_agent
- created_at
- last_used_at
- revoked_at
```

Never request notification permission immediately on first page load.

Ask after a meaningful user action.

---

# 25. Character Re-engagement Messages

## Desired behavior

If the user leaves a conversation, the character may later send a message such as “Where did you go?” but not annoyingly.

## Rules

Only send when:

- conversation was active,
- last message context supports follow-up,
- conversation is not muted,
- user has not disabled proactive messages,
- minimum inactivity threshold passed,
- character has not recently sent another proactive message,
- daily/weekly cap is respected.

Suggested limits:

- no sooner than 6 hours,
- maximum one proactive message per character per 24 hours,
- maximum three total proactive messages per user per day,
- stop after two ignored proactive attempts.

Use durable scheduled jobs.

---

# 26. Conversation Mute

Add:

```http
PATCH /v1/conversations/:id/settings
```

Payload:

```ts
{
  mutedUntil?: string | null;
  proactiveMessagesEnabled?: boolean;
}
```

Frontend options:

- Mute 1 hour
- Mute 8 hours
- Mute 1 week
- Mute indefinitely
- Unmute

Muting must suppress push and proactive notifications, not normal message history.

---

# 27. Subscription and Pricing

## Current observation

Stripe checkout appears to work after retry, but pricing economics still need review.

## Required audit

For every tier calculate:

- included text messages,
- average model input tokens,
- average output tokens,
- image generations,
- video generations,
- voice ASR minutes,
- TTS minutes,
- storage,
- bandwidth,
- Stripe fee,
- support overhead,
- target gross margin.

Create a cost model in code or documentation.

Minimum target:

- maintain healthy gross margin under average usage,
- enforce usage limits,
- show clear overage behavior,
- prevent accidental unlimited expensive media.

## Billing reliability

Verify:

- checkout session,
- webhook signature,
- subscription created,
- subscription updated,
- cancellation,
- failed payment,
- plan entitlement update,
- customer portal,
- idempotency.

Do not trust checkout redirect alone. Stripe webhooks are the source of truth.

---

# 28. UI Quality Standard

The application should not look “vibe coded.”

## Remove or reduce

- excessive glass cards,
- weak transparency,
- random gradients,
- inconsistent rounded corners,
- too many tiny badges,
- inconsistent icon sizing,
- duplicated UI patterns,
- low-contrast text,
- fake metrics.

## Establish design tokens

Define:

- spacing scale,
- typography scale,
- radius scale,
- elevation scale,
- semantic colors,
- overlay colors,
- focus rings,
- motion durations,
- z-index scale.

Create Storybook or a development component gallery for:

- buttons,
- inputs,
- cards,
- menus,
- sheets,
- dialogs,
- post cards,
- chat rows,
- message bubbles,
- reaction pickers,
- progress rings.

---

# 29. Database Migration Checklist

Potential new/changed structures:

- hashtags
- post_hashtags
- post_link_previews
- durable social job queue
- user_sessions
- push_subscriptions
- conversation settings
- comment reactions constraints
- post reaction constraints
- story expiration indexes
- notification indexes
- media metadata fields
- message delivery/read fields

All migrations must:

1. be reversible where practical,
2. avoid destructive changes,
3. backfill existing rows,
4. add indexes concurrently where supported,
5. preserve production data.

---

# 30. Testing Requirements

## Unit tests

- mention parser with Unicode.
- hashtag parser.
- relationship delta logic.
- reaction toggling.
- feed filtering.
- proactive-message limits.
- link-preview URL security.
- story expiration.
- media-intent classification.

## Integration tests

- follow/unfollow persistence.
- post reaction persistence.
- comment reaction persistence.
- nested replies.
- character reply job.
- story create/view/expire.
- chat bootstrap after direct refresh.
- voice upload and playback.
- session refresh.
- notification creation.

## E2E tests

1. Login.
2. Open feed.
3. Create a post.
4. Refresh.
5. Verify post persists.
6. React.
7. Refresh.
8. Verify reaction persists.
9. Comment.
10. Reply to comment.
11. Refresh.
12. Verify thread persists.
13. Follow character.
14. Refresh Discover.
15. Verify Following state.
16. Open chat URL directly.
17. Refresh.
18. Verify header name/avatar.
19. Send voice note.
20. Refresh and replay.
21. Create story.
22. Verify story row.
23. Open copied post URL.
24. Verify OG metadata.

Test mobile viewport first.

---

# 31. Definition of Done

A phase is not complete until:

- backend persistence works,
- frontend refresh works,
- loading/error states exist,
- tests exist,
- mobile behavior is checked,
- direct URL refresh works,
- no placeholder values remain,
- no console errors remain,
- no NaN values appear,
- overlays are not clipped,
- accessibility basics are covered.

---

# 32. Immediate First Sprint

Implement these first because they produce the largest visible quality improvement:

## Sprint 1A — Persistence

1. Follow state from backend.
2. Post reactions persist and toggle.
3. Comment reactions persist and toggle.
4. Reply button works.
5. Chat header loads character directly.
6. User avatar appears in composer.
7. Fix NaN counts.

## Sprint 1B — Overlay and layout

1. Remove horizontal overflow.
2. Portal post menu.
3. Portal chat menu.
4. Share bottom sheet.
5. Improve menu opacity and z-index.

## Sprint 1C — Stories and feed

1. “Your Story” composer.
2. 72-hour expiration.
3. Only active story authors appear.
4. Feed only includes followed characters.

## Sprint 1D — AI interaction

1. Durable reaction jobs.
2. Character reply to user comment.
3. AI-to-AI comments and likes.
4. Structured prompt validation.
5. Relationship-aware discussion.

---

# 33. Known Current Code Issues Already Identified

## Discover

Current component state:

```ts
const [following, setFollowing] = useState(false);
```

This is incorrect because it resets after refresh.

Required:

```ts
const [following, setFollowing] = useState(Boolean(char.isFollowing));
```

and synchronize when server state changes.

## Redux reaction reducer

Current logic increments blindly.

Replace with server-authoritative reaction state.

## Chat header

Current character lookup depends on:

```ts
[...state.characters.mine, ...state.characters.discover]
```

Direct refresh can leave both arrays empty.

Fetch character detail directly.

## Voice notes

Current optimistic message uses a browser object URL.

That URL is not durable and cannot survive refresh.

Persist server playback URL in the message record.

## Delayed AI actions

Current use of `setTimeout` is not reliable across restart/deploy.

Move to durable workers.

---

# 34. Final Instruction to Coding Agent

Do not merely make the interface appear fixed.

Every social action must be backed by a real API mutation and a real database record.

When changing a feature:

1. inspect the database schema,
2. inspect the backend endpoint,
3. inspect the frontend thunk,
4. inspect the reducer,
5. inspect the component,
6. add tests,
7. verify refresh,
8. verify mobile layout.

Do not close a task because an optimistic UI change looks correct before refresh.
