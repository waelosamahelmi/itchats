# itChats Task List

## P0 — Critical

- [ ] Fix horizontal scrolling across the app.
- [ ] Fix the logged-in user avatar in the post composer.
- [ ] Persist post reactions after refresh.
- [ ] Remove all NaN like/reaction counts.
- [ ] Persist comment reactions after refresh.
- [ ] Make comment Reply work with parentCommentId.
- [ ] Make AI characters reply to comments on their posts.
- [ ] Make followed/mutual AI characters react to user posts.
- [ ] Replace setTimeout-based AI jobs with durable queued jobs.
- [ ] Persist Discover follow state and return isFollowing from the backend.
- [ ] Fix follower-count and score field mismatches.
- [ ] Load chat character name/avatar directly after refresh.
- [ ] Fix voice-message upload, playback, persistence, and AI response.
- [ ] Add refresh-token/session retry logic.

## P1 — Feed and posts

- [ ] Portalize three-dot menus and fix opacity/z-index.
- [ ] Render share UI as a mobile bottom sheet.
- [ ] Add pasted-link previews and persist metadata.
- [ ] Add Open Graph metadata and social preview images.
- [ ] Add intelligent @mention autocomplete.
- [ ] Support Unicode handles and names.
- [ ] Remove the separate mention button if redundant.
- [ ] Add hashtags, hashtag relations, pages, and search.
- [ ] Redesign the feelings picker.
- [ ] Verify image upload, compression, preview, retry, and persistence.
- [ ] Reuse one shared PostCard across feed and profiles.
- [ ] Show only own posts and followed-character posts in the feed.

## P1 — Stories

- [ ] Make Your Story create image, video, or text stories.
- [ ] Add captions.
- [ ] Set expiration to 72 hours.
- [ ] Show only authors with active stories.
- [ ] Persist viewed state.
- [ ] Sort unviewed stories first.
- [ ] Remove expired stories automatically.

## P1 — Discover

- [ ] Split Discover into Private and Public sections.
- [ ] Show only the current user’s private characters.
- [ ] Show all published public characters.
- [ ] Hide other users’ private characters.
- [ ] Persist Follow/Following state.
- [ ] Return authoritative follower counts.
- [ ] Define or hide the star score badge.
- [ ] Move search filtering to the backend.

## P1 — Chat

- [ ] Show avatar, name, last message, timestamp, unread count, and delivery state.
- [ ] Add sent/delivered/read indicators.
- [ ] Portalize chat menus.
- [ ] Add conversation mute options.
- [ ] Preserve metadata after direct refresh.
- [ ] Fetch complete chat-list rows from the backend.
- [ ] Add retry for failed messages.

## P1 — Relationship and AI

- [ ] Show relationship label and circular progress in the chat header.
- [ ] Define relationship stages.
- [ ] Track familiarity, trust, warmth, affinity, tension, and respect.
- [ ] Apply bounded message-based relationship deltas.
- [ ] Add diminishing returns and stage-dependent scaling.
- [ ] Prevent one message from skipping multiple stages.
- [ ] Make character tone depend on relationship stage.
- [ ] Build layered prompts with identity, mood, relationship, memory, and recent context.
- [ ] Use validated structured model output with one repair retry.
- [ ] Reduce repetition and generic assistant language.
- [ ] Add AI-to-AI likes, comments, and loop-limited replies.

## P2 — Media

- [ ] Add media-intent classification.
- [ ] Support selfie, full-body, outfit, environment, activity, detail, candid, and group images.
- [ ] Stop defaulting every request to a selfie.
- [ ] Use character reference packs and identity consistency.
- [ ] Add real video-request handling.
- [ ] Return an honest fallback when video generation is unavailable.

## P2 — Profile and settings

- [ ] Add profile and cover image upload.
- [ ] Add editable name, bio, location, and website.
- [ ] Allow posting from the user profile.
- [ ] Use shared PostCard for profile posts.
- [ ] Add Friends/Connections lists and clickable counts.
- [ ] Hide non-functional settings.
- [ ] Hide email notifications until configured.
- [ ] Persist language, theme, translation, push, mute, privacy, and content settings.
- [ ] Add logout-all-sessions and account deletion.

## P2 — Notifications and PWA

- [ ] Build a real notification model with unread count and deep links.
- [ ] Add mention, reply, reaction, follow, story, message, milestone, billing, and moderation notifications.
- [ ] Add Web Push subscriptions and VAPID keys.
- [ ] Handle push in the service worker.
- [ ] Support notification-click deep links.
- [ ] Respect muted conversations.
- [ ] Add inactivity-based character follow-ups with strict daily limits.

## P2 — Sessions and billing

- [ ] Use short-lived access tokens and rotating HttpOnly refresh cookies.
- [ ] Create a user_sessions table.
- [ ] Add token reuse detection and session revocation.
- [ ] Prevent parallel refresh storms.
- [ ] Verify Stripe checkout and webhook signatures.
- [ ] Use webhooks as the source of truth.
- [ ] Verify upgrades, downgrades, cancellations, failed payments, and entitlements.
- [ ] Audit text, image, video, ASR/TTS, storage, bandwidth, and Stripe costs.
- [ ] Adjust plan limits to preserve healthy gross margin.

## P3 — UI/UX polish

- [ ] Redesign bottom navigation for Home, Discover, Create, Chats, and Profile.
- [ ] Move Notifications to the top bar.
- [ ] Add safe-area support and pull-to-refresh.
- [ ] Preserve scroll positions.
- [ ] Add skeleton loaders and better empty states.
- [ ] Use bottom sheets on mobile.
- [ ] Standardize 44×44 touch targets.
- [ ] Reduce excessive glassmorphism.
- [ ] Standardize typography, spacing, radii, icons, shadows, motion, focus states, and z-index.

## Database

- [ ] Add unique post- and comment-reaction constraints.
- [ ] Add hashtag and post_hashtags tables.
- [ ] Add post_link_previews.
- [ ] Add durable AI/social job infrastructure.
- [ ] Add user_sessions and push_subscriptions.
- [ ] Add conversation settings and message delivery/read fields.
- [ ] Add media metadata and story/notification indexes.
- [ ] Write non-destructive migrations and backfills.

## Testing

- [ ] Unit-test mentions, Unicode parsing, hashtags, reactions, relationships, feed filtering, story expiration, link-preview security, and media intent.
- [ ] Integration-test follow persistence, reactions, replies, AI comment replies, stories, direct chat refresh, voice notes, token refresh, and notifications.
- [ ] E2E-test feed, Discover follow refresh, direct chat URL refresh, voice notes, stories, and social-sharing metadata.
- [ ] Run all primary flows on mobile viewport sizes.

## Release checklist

- [ ] No horizontal overflow.
- [ ] No NaN values.
- [ ] No disappearing reactions or follow state.
- [ ] No missing chat header after refresh.
- [ ] No clipped overlays.
- [ ] No broken reply buttons.
- [ ] No visible non-functional settings.
- [ ] No placeholder counts.
- [ ] No browser-only voice URLs.
- [ ] No critical setTimeout jobs.
- [ ] No console errors.
- [ ] All migrations applied and all tests passing.
- [ ] Mobile UX, PWA push, and Stripe webhooks verified.
