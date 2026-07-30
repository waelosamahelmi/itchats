# Real Relationship Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the publishable chat foundation with explicit chat/roleplay modes, structured thoughts, real message reactions, relationship-aware behavior, and admin relationship presets.

**Architecture:** Add pure shared conversation contracts and parsing first, then persist conversation mode and reactions in the API, then rebuild the chat UI on the normalized message model. Relationship presets remain an audited admin-only boundary.

**Tech Stack:** React 19, TypeScript 5.7, Vite 6, Tailwind CSS 4, NestJS 11, Drizzle ORM, PostgreSQL, Vitest 3.

## Global Constraints

- Preserve the existing monorepo and provider integrations.
- Use `chat` and `roleplay` as the only conversation modes in this slice.
- Render roleplay thoughts as `**thought text**` from structured response parts.
- Never use `window.alert()` for product errors.
- Character identity must use a real image URL when available and a deterministic fallback otherwise.
- All writes must be authenticated, authorized, idempotent where retryable, and test-covered.

---

### Task 1: Conversation presentation domain

**Files:**
- Create: `apps/web/src/features/ai/chatModel.ts`
- Create: `apps/web/src/features/ai/chatModel.test.ts`

**Interfaces:**
- Produces: `ConversationMode`, `ChatMessage`, `ResponsePart`, `normalizeHistoryMessage`, and `responsePartsToMessages`.

- [ ] Write failing tests proving history normalization preserves media, delivery state, and reactions, and proving thought parts only render in roleplay mode.
- [ ] Run `pnpm --filter @itchats/web test -- chatModel.test.ts` and confirm failures are caused by missing exports.
- [ ] Implement the smallest pure model and adapters that satisfy the behaviors.
- [ ] Re-run the focused tests and keep the output clean.

### Task 2: Conversation mode and response contract

**Files:**
- Modify: `packages/database/src/schema/conversations.ts`
- Modify: `packages/contracts/src/conversations.ts`
- Modify: `packages/ai-core/src/prompts/system.prompt.ts`
- Modify: `apps/api/src/ai/context-builder.service.ts`
- Test: `packages/ai-core/src/prompts/system.prompt.test.ts`

**Interfaces:**
- Consumes: `ConversationMode` values `chat | roleplay`.
- Produces: prompt instructions requiring structured `speech`, `action`, and `thought` response parts.

- [ ] Write prompt tests for phone-like chat behavior and roleplay-only thought output.
- [ ] Verify the tests fail before production changes.
- [ ] Add the persisted mode and mode-specific prompt contract.
- [ ] Verify focused tests, typecheck affected packages, and generate the migration.

### Task 3: Persisted reactions

**Files:**
- Create: `packages/database/src/schema/message-reactions.ts`
- Modify: `packages/database/src/schema/index.ts`
- Modify: `apps/api/src/conversations/conversations.controller.ts`
- Create: `apps/api/src/conversations/message-reactions.service.ts`
- Test: `apps/api/src/conversations/message-reactions.service.test.ts`

**Interfaces:**
- Produces: authenticated upsert/delete/list reaction operations keyed by message and actor.

- [ ] Write authorization and upsert behavior tests against a controlled repository boundary.
- [ ] Verify red, implement the service and routes, then verify green.
- [ ] Ensure history responses include reaction aggregates and actor attribution.

### Task 4: Modern real-chat interface

**Files:**
- Refactor: `apps/web/src/features/ai/AIChatPage.tsx`
- Create: `apps/web/src/features/ai/MessageBubble.tsx`
- Create: `apps/web/src/features/ai/ReactionBar.tsx`
- Create: `apps/web/src/features/ai/ChatComposer.tsx`
- Modify: `apps/web/src/styles/global.css`

**Interfaces:**
- Consumes: the Task 1 model and API response events.
- Produces: accessible message list, mode switch, anchored reaction bar, attachment tray, inline errors, and identity avatar.

- [ ] Add component behavior tests for long press, context menu, keyboard access, and mode switching.
- [ ] Verify the tests fail for missing components.
- [ ] Implement focused components and wire them into the page.
- [ ] Run focused tests, web typecheck, and web build.
- [ ] Inspect the rendered desktop and mobile states and correct visual defects.

### Task 5: Relationship presets and audited admin cheat

**Files:**
- Create: `apps/api/src/relationship/relationship-presets.ts`
- Create: `apps/api/src/admin/relationship-cheats.controller.ts`
- Modify: `apps/api/src/admin/admin.module.ts`
- Modify: `apps/admin/src/features/admin/AdminDashboard.tsx`
- Test: `apps/api/src/relationship/relationship-presets.test.ts`

**Interfaces:**
- Produces: named presets and admin-only audited apply operation.

- [ ] Write failing tests for every preset's bounded metric values and for preservation of character/user IDs.
- [ ] Implement presets, audit write, endpoint, and compact admin controls.
- [ ] Run focused tests and affected typechecks.

### Task 6: End-to-end verification

**Files:**
- Create: `cypress/integration/ai-real-chat.spec.ts`

**Interfaces:**
- Consumes: all earlier tasks.
- Produces: regression coverage for chat/roleplay, thoughts, reaction menu, and relationship display.

- [ ] Add the core browser scenarios using stable accessible selectors.
- [ ] Run unit tests, API/web/admin typechecks, production builds, and browser tests.
- [ ] Record any environment-dependent failures without masking them.

