# Real relationship chat — product design

## Product goal

ItChats should feel like an ongoing relationship with a person who has a stable identity, memory, mood, life, voice, and visual presence. The first publishable loop is: discover a character, understand who they are, start a conversation, receive natural messages, build a relationship through interaction quality, and exchange media without leaving the conversation.

## Scope and delivery order

The request spans several independent systems. They will ship as connected vertical slices:

1. Real relationship chat: typed message model, chat/roleplay modes, thoughts, reactions, presence, delivery states, relationship-aware prompting, and an admin relationship cheat.
2. Character identity and media: generated profile/reference identity, reference-conditioned selfies and mirror selfies, reference-conditioned video, progress/failure states, and safe prompt construction.
3. Voice and calls: persisted voice notes, character TTS replies, incoming/outgoing call lifecycle, live transcription, interruption, and cost controls.
4. Billing and reliability: atomic wallet operations, Stripe lifecycle idempotency, credit reservation/settlement, transaction history, alerts, and recovery.
5. Creator and social tools: complete character editing, stories, notifications, moderation, privacy, and publish-readiness QA.

Each slice must work end-to-end before the next depends on it.

## Core architecture

Conversation is the product spine. A conversation has a mode (`chat` or `roleplay`) and contains typed messages. Messages can be text, thought, image, video, audio, voice note, call event, relationship event, or system event. Reactions are first-class records rather than an unstructured metadata object. Delivery state progresses from sending to sent, delivered, and seen.

The web client renders one canonical message view model. API adapters normalize persisted history and streamed events into that model. Optimistic messages use a client idempotency key and reconcile with the server record.

Character behavior is built from explicit prompt sections: immutable identity, speaking style, current life state, relationship state, relevant memories, conversation-mode rules, and output contract. Chat mode uses short phone-like messages and never exposes narration. Roleplay mode may emit spoken dialogue, actions, and private thoughts. Thoughts are structured output and rendered as `**thought text**`; parsing never relies on arbitrary prose heuristics.

## Experience design

The visual direction is intimate, calm, and mobile-native: deep warm charcoal surfaces, restrained coral accent, expressive typography, large identity imagery, and minimal chrome. The conversation owns the screen. Utility actions move into a contextual attachment tray instead of competing beside the composer.

The header shows a real character avatar, presence/activity, and a subtle relationship label. A segmented control switches Chat and Roleplay with a clear explanation on first use. Long-pressing or right-clicking a message opens an anchored reaction bar. Character reactions use the same visual language and attribution.

The composer supports multiline text, image attachment, selfie/video requests, and press-to-record voice notes. Pending media appears as a message with generation progress. Errors remain inline and retryable. Browser alerts are not used.

## Relationship behavior

Relationship metrics change from message quality, continuity, conflict, repair, vulnerability, humor, and remembered details. The relationship snapshot is injected into every response prompt and maps to concrete behavioral constraints: disclosure depth, warmth, teasing, response length, initiative, and romantic boundaries. The UI communicates the relationship in human language, not raw scores.

Admins may apply named test presets (`stranger`, `friend`, `close_friend`, `romantic`, `conflict`) or adjust individual metrics. Every cheat is audit logged and visibly marked as a test override.

## Identity-conditioned media

A published character must have an approved primary portrait and identity reference pack. Selfie and video requests always include approved identity assets when the provider supports reference inputs. Prompts separate stable identity facts from scene direction and camera direction. Selfie presets include casual front-camera, mirror selfie, activity snapshot, dressed-up portrait, and candid low-light photo. Generated assets store their reference IDs, prompt version, provider, seed where available, and consistency score.

If identity assets are missing, the UI offers profile generation instead of sending an unconditioned request. Failed or low-consistency generations are not silently delivered.

## Voice and calls

Voice notes are uploaded, transcribed, persisted, and playable by both parties. Character voice replies use the character's configured voice and include text transcripts. Calls use an explicit ringing/connected/ended state machine, WebSocket signaling, streaming speech recognition and synthesis, interruption support, duration/cost display, and reconnect behavior.

## Billing invariants

Paid operations reserve credits atomically before provider work and settle against actual usage afterward. Failures release reservations. Ledger entries are immutable and idempotent. Stripe webhook events are stored and processed once. Development mode never silently grants a paid subscription; it uses an explicit admin-only simulation endpoint.

## Safety, privacy, and honesty

The product presents characters as AI characters and does not claim they are human. Call and media controls show generation state. Users can mute, block, report, export, and delete data. Sensitive memories require stricter retention rules. Notifications honor per-channel preferences and quiet hours.

## Error handling and observability

Every async operation exposes idle, pending, success, retryable failure, and terminal failure states. Requests carry idempotency and correlation IDs. Generation, billing, chat, and call events produce structured logs and user-safe error codes. Provider details remain server-side.

## Testing and acceptance

Pure domain behavior receives unit tests; API boundaries receive integration tests; the core discover-to-chat and purchase flows receive browser tests. The first slice is accepted when chat and roleplay render differently, structured thoughts render correctly, reactions work by long press and keyboard/mouse, character reactions persist, relationship state changes prompting behavior, and admin presets are auditable.

