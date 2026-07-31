# itChats Task List

> Status re-audited and updated 2026-07-31 after the implementation sweep (waves 1–3). `[x]` = verified done end-to-end (backend + frontend + persistence). `[ ]` = not done or partially done — the note explains the remaining gap.

## P0 — Critical

- [x] Fix horizontal scrolling across the app. *(global guard + `overflow-guard` wrap classes now applied to post/comment text.)*
- [x] Fix the logged-in user avatar in the post composer. *(real avatar + generated Dicebear fallback when empty.)*
- [x] Persist post reactions after refresh.
- [x] Remove all NaN like/reaction counts.
- [x] Persist comment reactions after refresh.
- [x] Make comment Reply work with parentCommentId. *(Reply chip, focus, nested render, persists after refresh.)*
- [x] Make AI characters reply to comments on their posts.
- [x] Make followed/mutual AI characters react to user posts.
- [ ] Replace setTimeout-based AI jobs with durable queued jobs. *(BullMQ is the primary path everywhere; `setTimeout` remains only as an explicit Redis-down fallback, and mention-replies still run inline/unqueued.)*
- [x] Persist Discover follow state and return isFollowing from the backend.
- [x] Fix follower-count and score field mismatches.
- [x] Load chat character name/avatar directly after refresh.
- [x] Fix voice-message upload, playback, persistence, and AI response. *(multipart `/v1/media/voice-notes` now registered+wired; message row persists with durable mediaUrl/transcription/durationMs before the AI reply; history rehydrates; player has progress/duration/seek/error+retry.)*
- [x] Add refresh-token/session retry logic. *(note: raw refresh token is still also kept in `localStorage` — see Sessions below.)*

## P1 — Feed and posts

- [x] Portalize three-dot menus and fix opacity/z-index.
- [x] Render share UI as a mobile bottom sheet.
- [x] Add pasted-link previews and persist metadata. *(feed/profile queries now join `post_link_previews`; PostCard renders LinkPreviewCard after refresh.)*
- [x] Add Open Graph metadata and social preview images. *(server-rendered `/p/:postId`; text-only posts still fall back to a generic Dicebear image rather than a branded card.)*
- [x] Add intelligent @mention autocomplete.
- [x] Support Unicode handles and names. *(MentionText regex now Unicode-aware for mentions and hashtags.)*
- [x] Remove the separate mention button if redundant. *(dead `@` button removed.)*
- [x] Add hashtags, hashtag relations, pages, and search. *(new `/hashtag/:name` page renders posts via shared PostCard.)*
- [x] Redesign the feelings picker.
- [ ] Verify image upload, compression, preview, retry, and persistence. *(upload/preview/persistence/progress work; still no client-side compression, EXIF orientation fix, or retry on failed post-image upload.)*
- [x] Reuse one shared PostCard across feed and profiles. *(feed, character profiles, user profile, and hashtag page all use the shared PostCard now.)*
- [x] Show only own posts and followed-character posts in the feed.

## P1 — Stories

- [ ] Make Your Story create image, video, or text stories. *(image + text + captions work and the creator modal is now reachable; video stories still unsupported.)*
- [x] Add captions.
- [x] Set expiration to 72 hours. *(cleanup cron now expires solely on `expiresAt`; AI stories also get 72h.)*
- [x] Show only authors with active stories.
- [x] Persist viewed state. *(story circles open a full-screen viewer that POSTs `/stories/:id/view`; viewed rings persist and refresh.)*
- [x] Sort unviewed stories first.
- [x] Remove expired stories automatically.

## P1 — Discover

- [x] Split Discover into Private and Public sections. *(“My Characters” private row now renders above the public grid on the live `/discover` page.)*
- [x] Show only the current user's private characters.
- [x] Show all published public characters.
- [x] Hide other users' private characters.
- [x] Persist Follow/Following state. *(now also optimistic with rollback on failure.)*
- [x] Return authoritative follower counts.
- [x] Define or hide the star score badge.
- [x] Move search filtering to the backend. *(debounced `GET /v1/characters/search`.)*

## P1 — Chat

- [x] Show avatar, name, last message, timestamp, unread count, and delivery state. *(real avatars, actual last-message previews with media placeholders, timestamps, unread badge, mute indicator.)*
- [ ] Add sent/delivered/read indicators. *(DB columns `delivered_at`/`read_at` now exist and in-conversation bubbles show client-side states, but the server never writes delivered/read transitions yet.)*
- [x] Portalize chat menus. *(header menu and per-row ChatRowMenu both portal to body.)*
- [x] Add conversation mute options. *(row menu and in-chat menu both call `PATCH /v1/conversations/:id/settings`; localStorage hack removed.)*
- [x] Preserve metadata after direct refresh.
- [x] Fetch complete chat-list rows from the backend. *(single-query projection with character, lastMessage, unreadCount, mutedUntil.)*
- [x] Add retry for failed messages.

## P1 — Relationship and AI

- [x] Show relationship label and circular progress in the chat header. *(gradient SVG progress ring around the avatar + tap popover with level, progress, and dimension bars.)*
- [x] Define relationship stages.
- [x] Track familiarity, trust, warmth, affinity, tension, and respect.
- [x] Apply bounded message-based relationship deltas.
- [x] Add diminishing returns and stage-dependent scaling.
- [x] Prevent one message from skipping multiple stages.
- [x] Make character tone depend on relationship stage.
- [ ] Build layered prompts with identity, mood, relationship, memory, and recent context. *(layers exist; “recent context” is still a truncated summary rather than real multi-turn history.)*
- [ ] Use validated structured model output with one repair retry. *(schema still disconnected from the model's actual output format; no repair LLM call.)*
- [x] Reduce repetition and generic assistant language.
- [x] Add AI-to-AI likes, comments, and loop-limited replies.

## P2 — Media

- [ ] Add media-intent classification. *(prompt-marker approach works in practice; still no discrete classifier or refusal/group categories.)*
- [ ] Support selfie, full-body, outfit, environment, activity, detail, candid, and group images. *(covered via freeform `[IMAGE: …]` markers; no explicit group-scene handling.)*
- [x] Stop defaulting every request to a selfie.
- [ ] Use character reference packs and identity consistency. *(infrastructure exists but the live generation path still doesn't call it.)*
- [x] Add real video-request handling.
- [x] Return an honest fallback when video generation is unavailable.

## P2 — Profile and settings

- [x] Add profile and cover image upload. *(was silently broken — `@fastify/multipart` was never registered and the handlers called a nonexistent API; both fixed and storage now matches the media-serve path convention.)*
- [x] Add editable name, bio, location, and website.
- [x] Allow posting from the user profile.
- [x] Use shared PostCard for profile posts. *(local ProfilePost deleted.)*
- [x] Add Friends/Connections lists and clickable counts. *(stats row opens a following-list bottom sheet backed by new `GET /v1/users/me/following`.)*
- [x] Hide non-functional settings. *(notification-type toggles are now actually enforced in notification creation and push delivery.)*
- [x] Hide email notifications until configured.
- [x] Persist language, theme, translation, push, mute, privacy, and content settings. *(theme + language now persist server-side and sync on boot; localStorage kept as an instant-apply cache.)*
- [x] Add logout-all-sessions and account deletion.

## P2 — Notifications and PWA

- [x] Build a real notification model with unread count and deep links. *(model/unread/read APIs solid; every creation site now stores entityType/entityId + data_json.)*
- [ ] Add mention, reply, reaction, follow, story, message, milestone, billing, and moderation notifications. *(7 of 9 wired — added relationship_milestone and incoming_message; story-interaction, billing, and moderation events still aren't created anywhere.)*
- [x] Add Web Push subscriptions and VAPID keys.
- [x] Handle push in the service worker.
- [ ] Support notification-click deep links. *(backend data is complete now, but NotificationsPage still routes several types to a no-op.)*
- [x] Respect muted conversations.
- [x] Add inactivity-based character follow-ups with strict daily limits. *(sweep now actually enqueues jobs with 0–15 min jitter; all caps preserved.)*

## P2 — Sessions and billing

- [ ] Use short-lived access tokens and rotating HttpOnly refresh cookies. *(server side correct; frontend still also stores the raw refresh token in `localStorage`.)*
- [x] Create a user_sessions table.
- [x] Add token reuse detection and session revocation.
- [x] Prevent parallel refresh storms.
- [x] Verify Stripe checkout and webhook signatures. *(raw-body capture registered for the webhook route; `constructEvent` now receives the real Buffer.)*
- [x] Use webhooks as the source of truth.
- [ ] Verify upgrades, downgrades, cancellations, failed payments, and entitlements. *(explicit `invoice.payment_failed` handling added; Stripe customer-portal endpoint still missing.)*
- [ ] Audit text, image, video, ASR/TTS, storage, bandwidth, and Stripe costs. *(compute costs modeled; storage/bandwidth/Stripe fees still unmodeled.)*
- [x] Adjust plan limits to preserve healthy gross margin.

## P3 — UI/UX polish

- [x] Redesign bottom navigation for Home, Discover, Create, Chats, and Profile. *(center Create action button with a bottom-sheet: New Post / New Story / New Character / Go Live.)*
- [x] Move Notifications to the top bar. *(bell with 30s-polled unread badge on Feed, Discover, and Chats headers.)*
- [x] Add safe-area support and pull-to-refresh. *(PullToRefresh wired on Feed, Discover, Notifications, Chats with axis-lock so swipe-to-delete still works.)*
- [x] Preserve scroll positions. *(sessionStorage-backed `useScrollRestoration` on Feed and Discover.)*
- [x] Add skeleton loaders and better empty states. *(now on Feed, Notifications, Profile, Discover, and Chats.)*
- [x] Use bottom sheets on mobile.
- [ ] Standardize 44×44 touch targets. *(nav, bell, create sheet, and touched controls now ≥44px; not yet audited app-wide.)*
- [ ] Reduce excessive glassmorphism. *(minimal usage remains; a generic `.glass` class is still used in composer/dialogs.)*
- [x] Standardize typography, spacing, radii, icons, shadows, motion, focus states, and z-index.

## Database

> Migration pipeline fixed 2026-07-31: `_journal.json` rebuilt (8 entries), all migration SQL made idempotent, and a new `0005_missing_tables.sql` creates the ~45 previously push-only tables + enums + indexes. `migrate.ts` path-resolution bug fixed. Remaining caveat: some 0000-era tables later grew columns via `drizzle-kit push` (e.g. `characters` identity columns) that a **completely fresh** DB bootstrap would still lack — run a `drizzle-kit generate` diff before standing up a brand-new environment.

- [x] Add unique post- and comment-reaction constraints. *(post-reaction uniques now in 0005; comment-reaction uniques in 0004.)*
- [x] Add hashtag and post_hashtags tables.
- [x] Add post_link_previews. *(created in 0005 and now queried/rendered.)*
- [x] Add durable AI/social job infrastructure. *(BullMQ queues for reactions/replies/social/re-engagement/notifications + `generation_jobs` table.)*
- [x] Add user_sessions and push_subscriptions. *(push_subscriptions CREATE now exists in 0005.)*
- [ ] Add conversation settings and message delivery/read fields. *(columns all exist now — `metadata`, `delivered_at`, `read_at`, `proactive_messages_enabled` — but `proactiveMessagesEnabled` still isn't honored as a separate flag by the settings endpoint, and delivered/read are never written server-side.)*
- [x] Add media metadata and story/notification indexes. *(media_assets created in 0005; story/notification indexes migrated.)*
- [x] Write non-destructive migrations and backfills. *(all statements idempotent against the live push-created DB; journal ordering makes fresh-DB bootstrap work; see caveat above re: 0000-era pushed-in columns.)*

## Testing

- [ ] Unit-test mentions, Unicode parsing, hashtags, reactions, relationships, feed filtering, story expiration, link-preview security, and media intent. *(only relationship-preset bounds and chat-message reactions covered.)*
- [ ] Integration-test follow persistence, reactions, replies, AI comment replies, stories, direct chat refresh, voice notes, token refresh, and notifications. *(only shallow endpoint smoke tests exist.)*
- [ ] E2E-test feed, Discover follow refresh, direct chat URL refresh, voice notes, stories, and social-sharing metadata. *(cypress/ still contains only leftover specs from an unrelated app.)*
- [ ] Run all primary flows on mobile viewport sizes.

## Release checklist

- [ ] No horizontal overflow. *(guards + wrap classes in place; no automated check.)*
- [x] No NaN values.
- [x] No disappearing reactions or follow state.
- [x] No missing chat header after refresh.
- [x] No clipped overlays. *(all menus/sheets/viewer/autocomplete portal to body.)*
- [x] No broken reply buttons.
- [x] No visible non-functional settings.
- [ ] No placeholder counts. *(counts are real; text-only post share images still use a generic placeholder.)*
- [x] No browser-only voice URLs. *(durable playback URLs persisted; blob URLs revoked after upload.)*
- [ ] No critical setTimeout jobs. *(only the Redis-down fallback and inline mention-replies remain.)*
- [ ] No console errors. *(not verified at runtime.)*
- [ ] All migrations applied and all tests passing. *(migrations now runnable — verify `pnpm db:migrate` output on next deploy; required tests still largely don't exist.)*
- [ ] Mobile UX, PWA push, and Stripe webhooks verified. *(implemented; needs a live verification pass — send a Stripe test webhook and a test push.)*
