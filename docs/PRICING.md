# ItChats Pricing & Financial Model

> Generated from `packages/ai-core/src/financial-model.ts`

## Overview

ItChats operates on a credits-based subscription model. Users receive a monthly credit allowance based on their plan tier, and each AI operation (chat, image generation, TTS, video, etc.) costs credits. Our pricing ensures a **75% target gross margin** on all AI operations, with a 1.25× reserve factor to account for provider price fluctuations and currency risk.

**Critical insight: Image generation is the dominant cost driver (85-95% of total per-user cost).** Characters generate images constantly — selfies during chat, profile pictures, story images, feed post images, and videos. Chat (LLM tokens) is negligible by comparison.

---

## Subscription Plans

| Plan | Price/mo | Credits | Max Private Chars | Max Public Chars | Max Auto Story Chars | Key Capabilities |
|------|----------|---------|-------------------|------------------|---------------------|------------------|
| **Free** | $0.00 | 500 | 2 | 0 | 0 | Basic chat, limited images, voice, feed, discover |
| **Starter** | $7.99 | 3,000 | 5 | 2 | 1 | + Character autonomy, NSFW filter |
| **Pro** | $19.99 | 15,000 | 20 | 10 | 5 | + Roleplay, custom voices, priority support |
| **Unlimited** | $49.99 | 75,000 | 100 | 50 | 20 | + API access, analytics |

### Why the price increase?

Our previous pricing model ($4.99/$14.99/$39.99) was based on severely undercounted image generation costs. The old model assumed 0.2-2 pro images per day. Real-world usage involves:

- **Character selfies during chat** — characters send [SELFIE] markers every 4-5 exchanges (5+ pro images/day per active character)
- **AI profile picture generation** — each character creation/update uses a pro image
- **Autonomous feed posts with images** — characters post to feed 1-2×/day with attached images
- **Character stories with images** — story generation includes image attachments
- **Video generation** — even occasional 5-second clips are expensive

All image operations use pro-quality models at $0.075/image for selfies/profiles/stories and $0.035/image for standard feed posts. Video at $0.025-0.15/second.

---

## Monthly Cost Breakdown (Per User)

### Usage Assumptions (Daily Averages)

| Metric | Free | Starter | Pro | Unlimited |
|--------|------|---------|-----|-----------|
| Chat exchanges/day | 10 | 25 | 40 | 60 |
| Input tokens/exchange | 350 | 450 | 500 | 550 |
| Output tokens/exchange | 150 | 250 | 300 | 400 |
| Standard images/day | 0.05 | 3 | 8 | 15 |
| Pro images/day | 0 | 1.5 | 5 | 10 |
| TTS utterances/day | 1 | 4 | 8 | 15 |
| Chars/TTS utterance | 150 | 250 | 280 | 350 |
| ASR transcriptions/day | 0.5 | 2 | 4 | 8 |
| ASR seconds/transcription | 15 | 20 | 25 | 35 |
| Videos/month | 0 | 2 | 5 | 12 |
| Video seconds | 5 | 5 | 6 | 8 |
| Credit utilization | 30% | 55% | 60% | 70% |

### What "Realistic Usage" Actually Costs in Credits (at 75% margin)

| Operation | Model(s) | Credits | Provider Cost |
|-----------|----------|---------|--------------|
| **Chat message (standard exchange)** | qwen3.5-flash | 2 | $0.00015 |
| **Chat message (roleplay session)** | qwen3.5-flash | 2 | $0.00036 |
| **Standard image** | qwen-image-2.0 | **175** | $0.035 |
| **Pro/high-quality image** | qwen-image-2.0-pro | **375** | $0.075 |
| **Profile picture gen** | qwen-image-2.0-pro | **375** | $0.075 |
| **Character selfie (pro image)** | qwen-image-2.0-pro | **375** | $0.075 |
| **Story with image** | qwen3.5-flash + pro image | **377** | $0.07528 |
| **Autonomous post (text only)** | qwen3.5-flash | 2 | $0.00014 |
| **Autonomous post (with standard image)** | qwen3.5-flash + standard | **176** | $0.03514 |
| **Autonomous post (with pro image)** | qwen3.5-flash + pro | **376** | $0.07514 |
| **Feed reaction** | qwen3.5-flash | 2 | $0.00012 |
| **Relationship eval** | qwen3.5-flash | 2 | $0.00009 |
| **News search** | qwen3.5-flash | 2 | $0.00010 |
| **TTS (short, ~200 chars)** | qwen3-tts-flash | 13 | $0.0026 |
| **TTS (medium, ~300 chars)** | qwen3-tts-flash | 20 | $0.0039 |
| **ASR (30 sec)** | qwen3-asr-flash | 6 | $0.00105 |
| **5s video (720p silent)** | wan2.6-i2v-flash | **625** | $0.125 |
| **5s video (720p audio)** | wan2.6-i2v-flash | **1,250** | $0.25 |
| **5s video (1080p audio)** | wan2.7-i2v | **3,750** | $0.75 |

> **Image operations dominate credit consumption.** A single pro image (375 credits) costs 187× more than a chat message (2 credits). Users who expect hundreds of images per month need the Pro or Unlimited plan.

### What Can You Actually Do with Each Plan?

| Usage Scenario | Credits Used | Free (500) | Starter (3,000) | Pro (15,000) | Unlimited (75,000) |
|---------------|-------------|------------|-----------------|-------------|-------------------|
| Chat only (50 exchanges/day) | ~100 | ✓ | ✓ | ✓ | ✓ |
| 1 character selfies only (5/day) | 1,875/day | ✗ | Runs out in 1.6 days | ✓ | ✓ |
| 1 char: 3 selfies + 2 story images/day | 1,875 | ✗ | 1.6 days | ✓ | ✓ |
| 3 chars: selfies + stories + posts | ~5,000/day | ✗ | ✗ | 3 days | ✓ |
| 5 chars: heavy autonomous usage | ~8,000/day | ✗ | ✗ | ✗ | 9.4 days |
| Occasional video (2× 5s 720p) | 1,250 | ✗ | ✓ (once) | ✓ | ✓ |
| Regular video (5× 5s 720p) | 3,125 | ✗ | ✗ | ✓ | ✓ |

> **Key takeaway**: The Free plan is a trial — barely enough for a few image generations. Starter supports one active character with moderate image use. Pro supports multiple characters with regular image generation. Unlimited is for power users with 5+ active characters.

### OUR Monthly Cost per User (Provider Cost, at Average Utilization)

| Cost Category | Free | Starter | Pro | Unlimited |
|--------------|------|---------|-----|-----------|
| Chat (LLM) | $0.01 | $0.06 | $0.12 | $0.27 |
| **Image generation** | **$0.02** | **$3.59** | **$11.79** | **$26.78** |
| TTS (voice) | $0.02 | $0.21 | $0.52 | $1.43 |
| ASR (transcription) | $0.00 | $0.02 | $0.06 | $0.21 |
| Video | $0.00 | $0.14 | $0.45 | $1.68 |
| **Total cost/mo** | **$0.04** | **$4.02** | **$12.95** | **$30.37** |

> *Image generation accounts for 85-95% of all costs across all tiers. Chat is ~1-2%.*

---

## Profit Analysis

| Plan | Price/mo | Credits | Our Cost/mo (avg) | Profit/mo | Gross Margin |
|------|----------|---------|-------------------|-----------|-------------|
| Free | $0.00 | 500 | $0.04 | -$0.04 | N/A (loss leader) |
| Starter | $7.99 | 3,000 | $4.02 | $3.97 | 49.7% |
| Pro | $19.99 | 15,000 | $12.95 | $7.04 | 35.2% |
| Unlimited | $49.99 | 75,000 | $30.37 | $19.62 | 39.3% |

### Credit Cap Protection

The credit cap acts as a hard limit on our exposure. At 75% margin, each credit costs us $0.0002 (retail value: $0.001):

| Plan | Credits | Max Provider Cost Exposure |
|------|---------|---------------------------|
| Free | 500 | $0.10 |
| Starter | 3,000 | $0.60 |
| Pro | 15,000 | $3.00 |
| Unlimited | 75,000 | $15.00 |

> Even if a user maxes out every credit on pro images ($0.075), our worst-case cost on the Unlimited plan is $15.00 — against $49.99 revenue (70% margin in worst case).

### Key Observations

1. **Free tier is a negligible loss leader** — each free user costs us ~$0.04/month in provider fees. At 60% free users, this is $24/month per 1,000 total users.

2. **Starter margins are tight (49.7%)** — image generation dominates costs. The credit cap (3,000) limits max cost to $0.60, but average usage at 55% of the full profile means costs are higher than the old model predicted. This tier needs monitoring.

3. **Pro (35.2%)** and **Unlimited (39.3%)** have lower margins than the 75% target on individual operations because users mix in many image operations. However, the credit cap prevents unbounded losses.

4. **The blended margin across all paid tiers is ~40.8%** at realistic distribution (60/25/10/5). This is lower than the 72.9% in the previous model, which was based on severely undercounted image generation.

5. **Margin improvement path**: To reach 60%+ blended margins, consider: (a) raising Pro to $24.99, (b) reducing Unlimited to 50,000 credits, (c) implementing image-specific monthly limits per plan, or (d) adding credit pack upsells for heavy image users.

---

## Sensitivity Analysis

| Scenario | Free Cost | Starter Profit | Pro Profit | Unlimited Profit |
|----------|-----------|---------------|------------|-----------------|
| **Base case** | $0.04 | $3.97 (49.7%) | $7.04 (35.2%) | $19.62 (39.3%) |
| **Provider cost +20%** | $0.05 | $3.18 (39.8%) | $4.52 (22.6%) | $13.67 (27.3%) |
| **Usage +50%** | $0.07 | $1.99 (24.9%) | $0.77 (3.9%) | $4.84 (9.7%) |
| **Worst case (+30% cost, +100% usage)** | $0.11 | -$0.86 (-10.8%) | -$6.52 (-32.6%) | -$11.74 (-23.5%) |

### Risk Mitigations

- **Credit caps protect against unbounded usage** — worst-case cost is always limited to credits × $0.0002
- **Cost +20%**: Pro and Unlimited remain profitable. Starter margin drops to 40%.
- **Usage +50%**: Pro margin becomes dangerously thin (3.9%). Credit caps would likely bind before this point.
- **Worst case**: Starter and Pro show losses. However, this scenario is unlikely because:
  - Credit caps prevent unbounded usage
  - The reserve factor (1.25×) already buffers against moderate cost increases
  - Margin guard service auto-switches to cheaper models below 55% margin
  - Users would deplete credits before reaching 2× usage

### Margin Improvement Recommendations

1. **Increase Pro to $24.99/month** → margin improves from 35.2% to ~48%
2. **Cap Unlimited at 60,000 credits** → maintains 50%+ margin
3. **Add image-specific limits**: Starter: max 50 standard + 25 pro images/month; Pro: 150 standard + 75 pro; Unlimited: 500 standard + 250 pro
4. **Credit pack upsells**: $4.99 for 2,000 extra credits (pure profit from image-heavy users)

---

## Monthly Cost Projections (at Scale)

Assumes realistic user distribution: 60% Free, 25% Starter, 10% Pro, 5% Unlimited.

| Users | Free Users | Paid Users | Monthly Revenue | Monthly Cost | Monthly Profit | Blended Margin |
|-------|-----------|-----------|----------------|-------------|---------------|---------------|
| 100 | 60 | 40 | $650 | $385 | $265 | 40.8% |
| 1,000 | 600 | 400 | $6,496 | $3,843 | $2,653 | 40.8% |
| 10,000 | 6,000 | 4,000 | $64,960 | $38,425 | $26,535 | 40.8% |
| 100,000 | 60,000 | 40,000 | $649,600 | $384,250 | $265,350 | 40.8% |

### Before/After Comparison

| Metric | Old Model | New Model (Realistic) | Change |
|--------|-----------|----------------------|--------|
| Starter price | $4.99 | $7.99 | +60% |
| Starter credits | 5,000 | 3,000 | -40% |
| Pro price | $14.99 | $19.99 | +33% |
| Pro credits | 20,000 | 15,000 | -25% |
| Unlimited price | $39.99 | $49.99 | +25% |
| Unlimited credits | 100,000 | 75,000 | -25% |
| Blended margin | 72.9% | 40.8% | -32.1pp |
| Monthly profit at 100K users | $346,000 | $265,350 | -23% |

> The old model severely undercounted image generation costs, leading to artificially high margins. The new realistic model shows the business is still profitable but requires price adjustments and close monitoring of image-heavy users.

### Breakeven Analysis

The platform breaks even when paid user revenue covers free user costs.

- Free user cost: $0.04 × 60,000 = $2,400/month for 100,000 total users
- Average paid user generates $16.24/month (weighted by distribution: 25% Starter × $7.99 + 10% Pro × $19.99 + 5% Unlimited × $49.99)
- Only ~148 paid users needed to cover free tier costs — trivially achievable
- With 100,000 total users: **net profit of $265,350/month**

---

## Credit Cost Reference

All values use the standard pricing formula with **75% target margin** and **1.25× reserve factor**:

```
credits = ceil(providerCost × 1.25 / 0.25 / 0.001)
```

| Operation | Model | Credits | Provider Cost |
|-----------|-------|---------|--------------|
| Chat message (standard) | qwen3.5-flash | 2 | $0.00015 |
| Chat message (roleplay) | qwen3.5-flash | 2 | $0.00036 |
| Feed reaction | qwen3.5-flash | 2 | $0.00012 |
| Relationship eval | qwen3.5-flash | 2 | $0.00009 |
| News search | qwen3.5-flash | 2 | $0.00010 |
| Autonomous post (text only) | qwen3.5-flash | 2 | $0.00014 |
| Autonomous post (with standard image) | qwen3.5-flash + qwen-image-2.0 | 176 | $0.03514 |
| Autonomous post (with pro image) | qwen3.5-flash + qwen-image-2.0-pro | 376 | $0.07514 |
| Autonomous story (text only) | qwen3.5-flash | 2 | $0.00028 |
| Autonomous story (with pro image) | qwen3.5-flash + qwen-image-2.0-pro | 377 | $0.07528 |
| **Standard image** | qwen-image-2.0 | **175** | $0.035 |
| **Pro image / Selfie** | qwen-image-2.0-pro | **375** | $0.075 |
| Profile picture gen | qwen-image-2.0-pro | 375 | $0.075 |
| TTS (short, ~200 chars) | qwen3-tts-flash | 13 | $0.0026 |
| TTS (medium, ~300 chars) | qwen3-tts-flash | 20 | $0.0039 |
| ASR (30 sec) | qwen3-asr-flash | 6 | $0.00105 |
| **5s video (720p silent)** | wan2.6-i2v-flash | **625** | $0.125 |
| 5s video (720p audio) | wan2.6-i2v-flash | 1,250 | $0.25 |
| 5s video (1080p audio) | wan2.7-i2v | 3,750 | $0.75 |

---

## Configurable Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `RESERVE_FACTOR` | 1.25 | Buffer for provider price fluctuations |
| `TARGET_MARGIN` | 0.75 | Target 75% gross margin per operation |
| `WARNING_MARGIN` | 0.55 | Alert if margin drops below 55% |
| `HARD_MIN_MARGIN` | 0.35 | Block operations below 35% margin |
| `CREDIT_DENOMINATION` | $0.001 | 1 credit = $0.001 retail value |
| `MIN_CREDITS_PER_OP` | 2 | Minimum credits per operation |

---

## Implementation Files

```
packages/ai-core/src/
  costing.ts           — Credit calculation engine + operation pricing
  financial-model.ts   — Cost/profit analysis

packages/database/src/schema/
  billing.ts           — Subscription plans, credit wallets, ledger

apps/api/src/billing/
  billing.service.ts   — Plan management, Stripe, wallet, seed
  billing.controller.ts — REST API for billing
  billing.module.ts    — Auto-seed on startup

apps/web/src/features/billing/
  BillingPage.tsx      — User-facing billing UI

docs/
  PRICING.md           — This document
  master/19-costing.md — Full costing specification
```

---

*Last updated: July 2026. Prices based on Alibaba DashScope public pricing. All costs in USD.*
*Revised: Image generation costs now accurately modeled as 85-95% of per-user cost. Plan prices and credits adjusted to reflect real-world usage patterns.*
