# 16 — Admin Panel Specification

## Overview

The ItChats Admin Panel is a standalone application (`apps/admin`) providing operators with full visibility and control over the AI character ecosystem. Built with React + Redux Toolkit + Vite, it connects to the same NestJS backend with admin-privileged endpoints.

**Access:** `/admin` route, JWT with `role=admin` required.

---

## Architecture

```
apps/admin/
├── src/
│   ├── app/
│   │   ├── store.ts          # Redux store
│   │   └── router.tsx        # Admin routes
│   ├── features/
│   │   ├── dashboard/        # Analytics dashboard
│   │   ├── characters/       # Character management
│   │   ├── reference-packs/  # Reference pack review
│   │   ├── identity/         # Identity versions + DNA viewer
│   │   ├── image-queue/      # Image generation queue
│   │   ├── relationships/    # Relationship heatmap
│   │   ├── stories/          # Story queue + moderation
│   │   ├── autonomous/       # Autonomous character management
│   │   ├── prompts/          # Prompt template editor
│   │   ├── memories/         # Memory browser
│   │   ├── analytics/        # Conversation analytics
│   │   ├── generations/      # Failed generation management
│   │   └── moderation/       # Reports + moderation
│   └── components/
│       ├── DataTable.tsx     # Reusable table
│       ├── StatusBadge.tsx   # Status indicator
│       ├── FilterBar.tsx     # Search + filters
│       └── RelationshipGraph.tsx  # D3.js force graph
```

---

## 1. Dashboard

### Key Metrics (Top Cards)

| Metric | Source | Refresh |
|--------|--------|---------|
| Total Characters | `SELECT count(*) FROM characters` | 30s |
| Active Characters (24h) | Characters with interaction in last 24h | 30s |
| Total Users | `SELECT count(*) FROM users` | 30s |
| Active Conversations | Conversations with messages in last 24h | 30s |
| Credits In Circulation | `SUM(balance) FROM credit_wallets` | 30s |
| Provider Spend Today | `SUM(actual_cost_minor) FROM provider_usage_events WHERE today` | 30s |
| Gross Margin % | `(revenue - cost) / revenue * 100` | 30s |
| Failed Generations (24h) | `SELECT count(*) FROM generation_jobs WHERE status='failed' AND today` | 30s |

### Charts

1. **Revenue Chart** — Daily gross/net revenue, 30-day line chart
2. **Generation Volume** — By type (chat/image/voice/video), stacked bar
3. **User Growth** — New registrations per day
4. **Character Creation** — New characters per day
5. **Provider Spend vs Revenue** — Dual-axis line chart
6. **Margin Health** — Gauge showing current margin vs target (75%)

### Alerts Panel

- Margin below warning threshold (55%)
- Provider reserve low
- Failed generation spike (> 10% failure rate)
- Moderation queue backlog (> 50 pending)

---

## 2. Character Management

### Character List Table

| Column | Source | Filterable |
|--------|--------|------------|
| Avatar | `avatarMediaId` | — |
| Name + Handle | `name`, `handle` | Search |
| Owner | `ownerUserId` → user email | Search |
| Status | `status` enum | Dropdown |
| Visibility | `visibility` enum | Dropdown |
| Identity Lock | `identityLock` boolean | Checkbox |
| Version | `identityVersion` | — |
| Followers | `character_follows` count | — |
| Created | `createdAt` | Date range |
| Actions | — | — |

### Actions per Character

| Action | Description | Endpoint |
|--------|-------------|----------|
| View DNA | Open character DNA viewer | `GET /v1/characters/:id` |
| View Reference Pack | Preview reference images | `GET /v1/characters/:id/reference-pack` |
| Suspend | Set `status=suspended` | `PATCH /v1/admin/characters/:id` |
| Disable | Set `status=disabled` | `PATCH /v1/admin/characters/:id` |
| Force Republish | Set `status=published` | `PATCH /v1/admin/characters/:id` |
| View Relationships | Open relationship heatmap | `GET /v1/admin/relationships/:id` |
| View Conversations | Browse user conversations | Inline panel |
| View Memories | Open memory browser | `GET /v1/admin/memories/:id/:userId` |

### Bulk Operations

- Suspend multiple (checkbox selection)
- Export CSV (selected columns)
- Force identity verification on selection

---

## 3. Reference Packs Management

### Purpose

Every character must have an approved reference pack before images can be generated publicly. The reference pack is the "ground truth" for character identity — 12-16 canonical images that define exactly what the character looks like.

### Reference Pack List

| Column | Description |
|--------|-------------|
| Character | Name + handle |
| Status | `generating` / `ready` / `approved` / `rejected` |
| Image Count | Number of images in pack |
| Identity Score | Aggregate consistency score (0-1) |
| Provider/Model | Which AI generated it |
| Generated At | When pack was created |
| Actions | Review, Approve, Reject, Regenerate |

### Review Interface

**Layout:** Grid of all reference images + identity details side panel.

**Per Image Display:**
- Full-resolution preview
- Reference type badge (portrait, selfie, casual, etc.)
- Identity score (how well it matches canonical identity)
- Prompt and seed used
- Checkbox: approve/reject individual image

**Identity Verification Panel:**
- Shows character DNA (all identity fields)
- Highlights the canonical seed
- Identity consistency score across all images
- Flag images with `identityScore < 0.7` as potential drift

### Approval Actions

| Action | Effect |
|--------|--------|
| Approve All | `status=approved`, `identityLock=true` on character |
| Approve Selected | Only approved images, others removed |
| Reject | `status=rejected`, back to generation queue |
| Regenerate Single | Request new image for rejected reference type |
| Regenerate All | New pack generation with same seed |

### Regeneration Flow

1. Admin selects images to regenerate
2. System generates new images with same canonical seed
3. New images appear in queue with status `generating`
4. Admin reviews and approves/rejects

### Filters

- Status (all / generating / ready / approved / rejected)
- Identity Score (below threshold)
- Date Range
- Character owner

---

## 4. Identity Versions

### Version History

For each character, a timeline of identity versions showing how the character's identity evolved.

**Version List:**
| Column | Description |
|--------|-------------|
| Version # | Sequential number |
| Created At | When this version was created |
| Origin | How it was created (user_created, ai_regenerated, admin_restored) |
| Locked | Whether this version is locked |
| Reference Pack | Link to associated reference pack |
| Actions | View, Compare, Restore |

### Version Comparison

Side-by-side diff view showing changes between two versions:
- New/removed/modified identity fields
- Prompt differences
- Structured identity JSON diff
- Image comparison (if reference pack changed)

### Restore Flow

1. Select a previous version
2. Preview the identity data
3. Confirm restore
4. System creates a NEW version (version+1) with the restored data
5. Reference pack is NOT automatically regenerated — admin gets option to regenerate

---

## 5. Image Generation Queue

### Purpose

Monitor and manage all image generation jobs across the platform. Track pending, in-progress, completed, and failed image generations.

### Queue View

| Column | Description |
|--------|-------------|
| Job ID | UUID |
| Character | Name + handle |
| User | Who requested |
| Type | `text_to_image` / `image_to_image` / `reference_pack` |
| Model | Which model used |
| Status | pending / processing / succeeded / failed |
| Credits | Cost in credits |
| Started At | When job began |
| Duration | Time to complete |
| Actions | Retry, View Result |

### Status Breakdown

| Status | Count | Visual |
|--------|-------|--------|
| Pending | N | Gray |
| Processing | N | Blue (spinner) |
| Succeeded | N | Green |
| Failed | N | Red |

### Queue Controls

- **Pause Queue:** Temporarily stop processing new image jobs
- **Resume Queue:** Restart processing
- **Clear Failed:** Remove all failed jobs
- **Retry All Failed:** Resubmit all failed jobs

### Per-Job Actions

- **View Result:** Open the generated image
- **View Prompt:** Show prompt, negative prompt, seed
- **Retry:** Resubmit with same parameters
- **Retry with Edit:** Modify prompt and retry
- **Cancel:** Cancel pending/processing job

---

## 6. Relationship Heatmap

### Purpose

Visualize the relationship network between characters and users. Identify popular characters, relationship clusters, and interaction patterns.

### Graph Visualization

Built with D3.js force-directed graph:

```
Nodes:
  - Characters (circle, size = follower count)
  - Users (square, smaller)

Edges:
  - Conversations (line thickness = interaction count)
  - Follows (dashed line)
  - Comments/story interactions (dotted line)

Colors:
  - Green: High relationship score (7-10)
  - Yellow: Medium (4-6)
  - Red: Low (1-3)
  - Gray: No relationship
```

### Filters

- Date range (show relationships active in period)
- Minimum interaction count
- Character autocomplete (filter to specific character)
- Relationship score threshold

### Node Detail (Click)

Clicking a character node opens a detail panel:

```
Character: Luna (@luna)
Total Relationships: 47
Active Relationships (30d): 23

Top Relationships:
  1. User "john_doe" — Score: 8.2 (warm, high trust)
  2. User "alice_c" — Score: 7.1 (friendly)
  3. Character "Kai" — Score: 6.8 (collaborative)

Relationship Metrics:
  - Average familiarity: 0.72
  - Average trust: 0.65
  - Average warmth: 0.78
  - Relationship growth (30d): +12%
```

### Character-to-Character Relationships

NEW feature showing the social graph between characters:

- Character A follows Character B
- Character friendships (bidirectional)
- Character story comments
- Character events attended together

---

## 7. Story Queue

### Purpose

Monitor and moderate auto-generated stories. Review content before publication (optional moderation gate).

### Story List

| Column | Description |
|--------|-------------|
| Character | Name + handle |
| Story Type | photo / text / video |
| Preview | Thumbnail or text excerpt |
| Auto-Generated | Yes/No badge |
| Caption | Story caption |
| Status | pending_review / approved / rejected / published |
| Views | Count |
| Likes | Count |
| Created At | Timestamp |
| Actions | Approve, Reject, Delete |

### Moderation Gate

Optional setting per character: "Require admin approval before auto-publishing." When enabled:
1. Story is generated by `StorySchedulerService`
2. Story enters queue with `status=pending_review`
3. Admin reviews and approves/rejects
4. Approved stories auto-publish; rejected ones are discarded

### Bulk Operations

- Approve all (filtered view)
- Reject all (filtered view)
- Delete all expired (stories > 24h)

### Story Details

Click a story row to expand:
- Full-size media preview
- AI prompt used for generation
- Generation metadata (model, seed, cost)
- Character context at time of generation (mood, activity, location)

---

## 8. Autonomous Characters

### Purpose

Manage characters with autonomy enabled. Monitor their activity, configure schedules, and control autonomous behavior.

### Autonomous Character List

| Column | Description |
|--------|-------------|
| Character | Name + handle |
| Autonomy Level | low / medium / high |
| Story Cadence | hourly / daily / weekly |
| Last Story | When last auto-story was generated |
| Stories Today | Count |
| Status | active / paused / error |
| Schedule | Current time-block activity |
| Actions | Pause, Configure, Force Generate |

### Character Schedule Viewer

Visual timeline showing the character's daily schedule:

```
00:00 ──── sleep ──── 08:00
08:00 ── wake/morning ── 09:00
09:00 ──── work ──── 14:00
14:00 ──── lunch ──── 15:00
15:00 ──── creative ──── 19:00
19:00 ──── social ──── 21:00
21:00 ──── relax ──── 23:00
23:00 ──── sleep ──── 00:00
```

### Autonomy Configuration

Per-character settings:

| Setting | Options | Description |
|---------|---------|-------------|
| Autonomy Level | low / medium / high | How independently the character acts |
| Story Cadence | hourly / daily / weekly | How often auto-stories are generated |
| Max Stories/Day | 1-24 | Cap on daily auto-generated content |
| Active Hours | time range | When the character can generate stories |
| Moderation Gate | on/off | Require admin approval |
| Content Style | casual / artistic / lifestyle / professional | Preferred story aesthetic |

### Force Trigger

Admin can manually trigger:
- **Generate Story Now:** Creates one story immediately
- **Simulate Day:** Runs a full day simulation (generates multiple stories)
- **Update Relationship:** Recalculates a character's relationships
- **Regenerate Schedule:** AI regenerates the character's daily schedule

---

## 9. Prompt Templates

### Purpose

Manage the system prompt templates used for AI interactions. These define character behavior, memory extraction, and generation quality.

### Template Types

| Template | Used For | Variables |
|----------|----------|-----------|
| `character_personality` | Chat system prompt | `{name}`, `{personality}`, `{backstory}`, `{interests}`, `{speakingStyle}`, `{relationship}`, `{memories}` |
| `memory_extraction` | Memory classification | `{userMessage}`, `{aiResponse}` |
| `image_generation` | Selfie/image prompts | `{name}`, `{gender}`, `{ageDisplay}`, `{description}`, `{context}` |
| `story_generation` | Auto-story creation | `{name}`, `{mood}`, `{activity}`, `{location}`, `{timeOfDay}`, `{contentStyle}` |
| `identity_autofill` | Character creation autofill | `{name}`, `{concept}` |
| `relationship_analysis` | Relationship scoring | `{conversation}` |
| `identity_verification` | Identity drift detection | `{canonicalIdentity}`, `{generatedPrompt}` |

### Template Editor

**Edit Interface:**
- Markdown preview with variable highlighting
- Variable list with descriptions
- Test panel: Input sample variables, see rendered output
- Version history (templates are versioned)
- Active/Inactive toggle

### Template Structure

```json
{
  "id": "uuid",
  "type": "character_personality",
  "name": "Default Character Chat",
  "version": 2,
  "content": "You are {name}, a {ageDisplay} {gender}...\n\nPersonality: {personality}\nBackstory: {backstory}\n\n{memories}\n\nCurrent relationship: {relationship}\n\nRespond naturally...",
  "variables": ["name", "personality", "backstory", "interests", "speakingStyle", "relationship", "memories"],
  "isActive": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Default Templates (shipped)

1. **Character Chat (Standard):** Full personality + context injection
2. **Character Chat (Minimal):** Lightweight for quick responses
3. **Memory Extraction:** Structured JSON output for memory classification
4. **Selfie Generation:** Character-aware image prompt construction
5. **Story Generation:** Contextual story creation based on schedule
6. **Identity Autofill:** Generates complete character DNA from name+concept
7. **Identity Verification:** Compares generated content against canonical identity

---

## 10. Memory Browser

### Purpose

Browse and inspect AI-generated memories for any character-user pair. Audit what the AI "remembers" about users.

### Search Interface

**Filters:**
- Character (autocomplete, required)
- User (autocomplete)
- Memory Type (dropdown: identity_fact, preference, relationship_event, promise, recurring_topic, sensitive_fact, temporary_context)
- Importance Range (slider: 0-1)
- Confidence Range (slider: 0-1)
- Date Range

### Memory List

| Column | Description |
|--------|-------------|
| Character | Name |
| User | Email/username |
| Content | Memory text (truncated) |
| Type | Badge |
| Importance | Progress bar 0-1 |
| Confidence | Progress bar 0-1 |
| Recalls | How many times recalled |
| Last Recalled | Timestamp |
| Created | Timestamp |
| Actions | View Source, Delete |

### Memory Detail

Click to expand:
- Full memory content
- Source conversation messages (linked)
- Recall history timeline
- Importance/confidence over time chart

### Bulk Operations

- Delete all memories for a character-user pair
- Delete memories of a specific type
- Delete low-confidence memories (< 0.3)
- Delete expired memories

---

## 11. Conversation Analytics

### Purpose

Analyze conversation quality, volume, and patterns across the platform.

### Overview Metrics

| Metric | Description |
|--------|-------------|
| Total Conversations | All-time count |
| Active Conversations (24h) | With messages in last 24h |
| Avg Messages/Conversation | Mean message count |
| Avg Conversation Length | Time from first to last message |
| Top Characters | By conversation count |
| Top Users | By message count |

### Charts and Analysis

1. **Messages per Hour** — 24-hour heatmap showing peak activity times
2. **Conversation Length Distribution** — Histogram (short < 10, medium 10-50, long > 50 messages)
3. **Character Popularity** — Bar chart of top 20 characters by message volume
4. **User Retention** — % of users returning within 7/14/30 days
5. **Response Times** — Average time between user message and AI response
6. **Abandonment Rate** — % conversations with only 1 user message (no follow-up)

### Per-Conversation Drill-Down

Search for specific conversations by:
- Conversation ID
- User email
- Character name

View full message history with timestamps, types, and AI metadata.

---

## 12. Character DNA Viewer

### Purpose

Complete, read-only view of every character identity field. The "source of truth" for what a character IS.

### Layout

**Left Panel — Identity DNA:**
```
┌─────────────────────────────────┐
│ CHARACTER DNA: Luna (@luna)     │
│ Version: 3 | Lock: ✅ | Score: 94%│
├─────────────────────────────────┤
│ CORE IDENTITY                    │
│   Canonical Name: Luna          │
│   Age: mid-20s                  │
│   Gender: female                │
│   Pronouns: she/her             │
│   Occupation: Digital Artist     │
│   Nationality: Japanese          │
│   Ethnicity: East Asian          │
│                                 │
│ PERSONALITY TRAITS               │
│   Energy: 6/10                  │
│   Confidence: 0.7               │
│   Curiosity: 0.85               │
│   Optimism: 0.6                 │
│   Affection: 0.75               │
│   Jealousy: 0.2                 │
│   Ambition: 0.7                 │
│   Intelligence: 0.85            │
│   Emotional Baseline: calm       │
│                                 │
│ PHYSICAL APPEARANCE              │
│   Height: 5'4"                  │
│   Body: slim                    │
│   Skin: fair                    │
│   Eyes: dark brown              │
│   Hair: Shoulder-length silver   │
│   Features: Mole under left eye  │
│   Wardrobe: Oversized sweaters   │
│   Accessories: Round glasses     │
│                                 │
│ BEHAVIORAL                       │
│   Speaking: Soft-spoken...       │
│   Humor: dry, self-deprecating   │
│   Emoji: Minimal                 │
│   Typing: 12 avg words           │
│                                 │
│ LIFESTYLE                        │
│   Sleep: 00:00-08:00            │
│   Music: Lo-fi, city pop         │
│   Food: Ramen, matcha            │
│                                 │
│ PSYCHOLOGICAL                    │
│   Secrets: [1]                   │
│   Goals: [2]                     │
│   Fears: [1]                     │
│   Routines: [morning, work, ...]  │
└─────────────────────────────────┘
```

**Right Panel — Reference Images:**
```
┌─────────────────────────────────┐
│ REFERENCE PACK — Approved        │
│ 12/16 images | Score: 0.94      │
├─────────────────────────────────┤
│ [portrait] [portrait_smile]     │
│ [portrait_side] [portrait_full] │
│ [selfie]    [casual]            │
│ [indoor]    [outdoor]           │
│ [sitting]   [walking]           │
│ [night]     [formal]            │
└─────────────────────────────────┘
```

### Identity Score Breakdown

| Dimension | Score | Weight |
|-----------|-------|--------|
| Physical Consistency | 0.96 | 40% |
| Personality Coherence | 0.91 | 30% |
| Behavioral Authenticity | 0.93 | 20% |
| Image Generation Fidelity | 0.94 | 10% |
| **Aggregate** | **0.94** | — |

---

## 13. Identity Verification

### Purpose

Proactively detect identity drift — when generated images no longer match the character's canonical identity.

### Verification Process

1. **Automated Checks (every generation):**
   - Face embedding comparison against reference pack (planned: pgvector)
   - Prompt analysis (is the generation prompt consistent with character DNA?)
   - Image quality check (resolution, artifacts, NSFW detection)

2. **Scheduled Audits (daily):**
   - Re-generate a test image for each published character
   - Compare against canonical identity
   - Flag characters with identity score < 0.7

3. **Admin-Initiated Verification:**
   - Force re-verification of any character
   - Batch verify all characters with unlocked identity

### Verification Dashboard

| Column | Description |
|--------|-------------|
| Character | Name + handle |
| Last Verified | Timestamp |
| Identity Score | 0-1 with color coding |
| Drift Detected | Yes/No |
| Images Checked | Count |
| Failed Images | Count |
| Actions | View Details, Regenerate Pack, Lock Identity |

### Drift Detail View

When drift is detected:
- Side-by-side comparison: canonical ref image vs. generated image
- Prompt analysis: what prompt produced the drift
- Score breakdown showing which dimensions failed
- Recommended action (regenerate pack, adjust prompt, increase negative prompt specificity)

---

## 14. Failed Generations

### Purpose

Monitor, diagnose, and retry failed AI generations across all types (chat, image, voice, video).

### Failed Generation List

| Column | Description |
|--------|-------------|
| Job ID | UUID |
| Type | Chat / Image / Voice / Video |
| User | Who requested |
| Character | Target character (if applicable) |
| Model | Which model |
| Error | Error code/message |
| Attempt | Retry count |
| Failed At | Timestamp |
| Cost | Estimated credits that would have been charged |
| Actions | Retry, View Details, Discard |

### Error Categories

| Error Code | Description | Retryable |
|------------|-------------|-----------|
| `PROVIDER_ERROR` | AI provider returned an error | Yes |
| `TIMEOUT` | Generation exceeded timeout | Yes |
| `INSUFFICIENT_CREDITS` | User had insufficient balance | No (user must top up) |
| `CONTENT_FILTER` | Generation blocked by safety filter | No (review prompt) |
| `INVALID_PROMPT` | Prompt failed validation | No (fix prompt) |
| `RATE_LIMITED` | Provider rate limit hit | Yes (with backoff) |
| `NETWORK_ERROR` | Connection to provider failed | Yes |
| `UNKNOWN` | Unclassified error | Yes (once) |

### Retry Logic

- **Auto-retry:** System retries `PROVIDER_ERROR`, `TIMEOUT`, `NETWORK_ERROR` up to 3 times with exponential backoff (1s, 5s, 25s)
- **Manual retry:** Admin can retry any failed job
- **Batch retry:** Retry all retryable failures in a date range

### Analytics

- Failure rate over time (line chart)
- Failure by model (bar chart)
- Failure by type (pie chart)
- Top error reasons (table)

---

## 15. Moderation Panel

### Report Queue

| Column | Description |
|--------|-------------|
| Report ID | UUID |
| Reporter | User email |
| Entity Type | character / story / message / user |
| Entity ID | UUID |
| Reason | Category |
| Detail | Reporter's description |
| Reported At | Timestamp |
| Status | pending / investigating / resolved / dismissed |
| Actions | View Entity, Resolve, Dismiss |

### Resolution Actions

- **Dismiss:** Report is invalid, no action needed
- **Warn:** Send warning to content owner
- **Suspend Character:** Set `status=suspended`
- **Remove Content:** Delete story/message
- **Ban User:** Disable user account

### Moderation Log

All moderation actions are logged with:
- Admin who took action
- Timestamp
- Action type
- Reason
- Affected entity

---

## 16. Prompt Template Editor (Detail)

The prompt template editor is a critical admin tool. It allows operators to fine-tune AI behavior without code changes.

### Editor Features

1. **Syntax-highlighted text area** with variable autocomplete
2. **Variable sidebar:** Lists all available variables with types and descriptions
3. **Live preview:** Render template with sample variables
4. **Test AI:** Send a test request using the template and see the AI response
5. **Version diff:** Compare current vs. previous version
6. **Rollback:** Restore any previous version
7. **A/B testing:** Set two active templates and measure response quality

### Variable System

```
{name}              — Character display name
{canonicalName}     — Immutable identity name
{personality}       — Personality text
{backstory}         — Origin story
{interests}         — JSON array of interests
{dislikes}          — JSON array of dislikes
{speakingStyle}     — How they talk
{humorStyle}        — Humor type
{emojiStyle}        — Emoji usage pattern
{values}            — Core values
{relationship}      — Current relationship summary
{memories}          — Recent relevant memories (top 5, scored)
{emotionState}      — { mood, energy, currentActivity }
{location}          — Current city/location
{timeOfDay}         — Morning/Afternoon/Evening/Night
{conversationHistory} — Last 20 messages
{userName}          — Display name of the user
```

---

## Admin Navigation Structure

```
/admin
├── /admin/dashboard           # Analytics dashboard
├── /admin/characters          # Character list
│   └── /admin/characters/:id  # Character detail (DNA viewer)
├── /admin/reference-packs     # Reference pack review
│   └── /admin/reference-packs/:id  # Pack detail + review
├── /admin/identity            # Identity versions
│   └── /admin/identity/verify # Identity verification
├── /admin/image-queue         # Image generation queue
├── /admin/relationships       # Relationship heatmap
├── /admin/stories             # Story queue + moderation
├── /admin/autonomous          # Autonomous character management
├── /admin/prompts             # Prompt template editor
├── /admin/memories            # Memory browser
├── /admin/analytics           # Conversation analytics
├── /admin/generations         # Failed generations
├── /admin/moderation          # Reports + moderation
└── /admin/settings            # Admin settings
```

---

## Tech Implementation Notes

### State Management

Admin panel uses its own Redux store (`apps/admin/src/app/store.ts`) separate from the web app. Slices:

```
admin/
  dashboard    — Metrics + charts data
  characters   — Character list + detail
  refPacks     — Reference pack review
  identity     — Identity versions
  imageQueue   — Image generation queue
  relationships — Graph data
  stories      — Story queue
  autonomous   — Autonomous characters
  prompts      — Prompt templates
  memories     — Memory browser
  analytics    — Conversation analytics
  generations  — Failed generations
  moderation   — Reports
```

### Real-time Updates

Dashboard metrics and queue statuses poll every 30 seconds. Future: WebSocket subscription for live queue updates.

### Authorization

All `/v1/admin/*` endpoints check `req.user.role === 'admin'`. The admin panel redirects non-admin users to `/`.

### Build

Admin panel is built separately: `pnpm --filter @itchats/admin build`. Served by Nginx as a separate path (`/admin/*` → admin static files).

---

## Security Considerations

1. **Admin-only access:** JWT role check on every endpoint
2. **Audit logging:** All admin actions logged with admin ID + timestamp
3. **Idempotent moderation:** Double-click protection on approve/reject/dismiss
4. **Rate limiting:** Admin endpoints have higher limits but are still rate-limited
5. **Session timeout:** Admin sessions expire after 30 min inactive (configurable)
6. **IP whitelist (optional):** Environment variable to restrict admin access to specific IPs
