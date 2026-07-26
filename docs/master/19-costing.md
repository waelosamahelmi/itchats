# 19 — Complete Costing Model

## Overview

ItChats operates on a credits-based billing system where users purchase credits and consume them for AI operations. Every generation is metered, priced with a margin, and tracked in the treasury system. The platform must maintain a healthy gross margin (target: 75%) on all AI operations.

---

## Provider Pricing (Alibaba DashScope)

All prices sourced from Alibaba DashScope public pricing (verified at time of implementation, stored in `provider_prices` table for versioning).

### Chat / LLM Models (per 1M tokens)

| Model | Input ($/1M) | Output ($/1M) | Best For |
|-------|-------------|---------------|----------|
| `qwen3.5-flash` | $0.10 | $0.40 | Default chat (balanced) |
| `qwen3.6-flash` | $0.25 | $1.50 | Higher quality chat |
| `deepseek-v4-flash` | $0.20 | $0.40 | Coding/reasoning |
| `qwen-flash` | $0.05 | $0.40 | Memory extraction (cheap) |

### Image Models (per image)

| Model | Cost/Image | Resolution | Use Case |
|-------|-----------|------------|----------|
| `qwen-image-2.0` | $0.035 | 1024×1024 | Standard image gen |
| `qwen-image-2.0-pro` | $0.075 | 1024×1024 | High quality (reference packs, selfies) |
| `qwen-image-edit-plus` | $0.03 | 1024×1024 | Image-to-image editing |
| `wan2.2-t2i-plus` | $0.05 | 1024×1024 | Text-to-image fallback |
| `wan2.6-t2i` | $0.03 | 1024×1024 | Budget image gen |

### Video Models (per second)

| Model | Quality | Audio | Cost/Second |
|-------|---------|-------|-------------|
| `wan2.6-i2v-flash` | 720p | Silent | $0.025 |
| `wan2.6-i2v-flash` | 720p | Audio | $0.050 |
| `wan2.6-i2v-flash` | 1080p | Silent | $0.0375 |
| `wan2.6-i2v-flash` | 1080p | Audio | $0.075 |
| `wan2.7-i2v` | 720p | Audio | $0.10 |
| `wan2.7-i2v` | 1080p | Audio | $0.15 |

### TTS & ASR

| Model | Unit | Cost |
|-------|------|------|
| `qwen3-tts-flash` | Per 10K characters | $0.13 |
| `qwen3-tts-flash-realtime` | Per 10K characters | $0.13 |
| `qwen3-asr-flash` | Per second | $0.000035 |

### Embedding

| Model | Cost/1M tokens |
|-------|---------------|
| `text-embedding-v4` | $0.07 |

---

## Credit Calculation Engine

### Formula (from `packages/ai-core/src/costing.ts`)

```typescript
function calculateCredits(
  providerCostUsd: number,
  reserveFactor = 1.25,
  targetMargin = 0.75
): number {
  const retailValue = providerCostUsd * reserveFactor / (1 - targetMargin);
  return Math.ceil(retailValue / 0.001);
}

function getCreditCost(model, capability, params): number {
  const providerCost = getEstimatedCost(model, capability, params);
  const credits = calculateCredits(providerCost);
  return Math.max(credits, 2); // Minimum 2 credits
}
```

### How It Works

1. **Estimate provider cost** in USD based on model, capability, and parameters
2. **Apply reserve factor** (1.25×) — accounts for provider price fluctuations, overage, currency risk
3. **Apply target margin** (75%) — ensures healthy profit
4. **Convert to credits** at 1 credit = $0.001 internal value (ceil to whole credits)
5. **Apply floor** — minimum 2 credits per operation (covers overhead)

### Worked Example: Chat Message

```
Model: qwen3.5-flash
Input: 3,000 tokens → (0.10 × 3000 / 1,000,000) = $0.00030
Output: 500 tokens  → (0.40 × 500 / 1,000,000)  = $0.00020
Total provider cost: $0.00050

Reserve-adjusted: $0.00050 × 1.25 = $0.000625
Retail at 75% margin: $0.000625 / 0.25 = $0.0025
Credits: ceil($0.0025 / 0.001) = 3
Min check: max(3, 2) = 3 credits
```

### Worked Example: Image Generation (Standard)

```
Model: qwen-image-2.0
Cost per image: $0.035

Reserve-adjusted: $0.035 × 1.25 = $0.04375
Retail at 75% margin: $0.04375 / 0.25 = $0.175
Credits: ceil($0.175 / 0.001) = 175 credits
```

### Worked Example: Image Generation (Pro — Reference Pack / Selfie)

```
Model: qwen-image-2.0-pro
Cost per image: $0.075

Reserve-adjusted: $0.075 × 1.25 = $0.09375
Retail at 75% margin: $0.09375 / 0.25 = $0.375
Credits: ceil($0.375 / 0.001) = 375 credits
```

---

## Per-Feature Credit Costs

### Chat & Conversations

| Feature | Model | Credits | Notes |
|---------|-------|---------|-------|
| AI Chat (standard) | `qwen3.5-flash` | 2-5 | Based on message length |
| AI Chat (premium) | `qwen3.6-flash` | 5-10 | Higher quality, longer responses |
| Memory Extraction | `qwen-flash` | 1-2 | Background, per exchange |
| Relationship Update | — | 0 | Free (no AI generation) |
| Auto-React Emoji | — | 0 | Free (keyword matching, no AI) |

### Image Generation

| Feature | Model | Credits | Notes |
|---------|-------|---------|-------|
| Standard Image | `qwen-image-2.0` | 44 | 1024×1024 |
| High Quality Image | `qwen-image-2.0-pro` | 94 | For reference packs |
| Image-to-Image Edit | `qwen-image-edit-plus` | 38 | Edit existing image |
| Character Selfie | `qwen-image-2.0-pro` | 94 | Character-aware prompt |
| Reference Pack (12 images) | `qwen-image-2.0-pro` | 1,128 | 12 × 94 credits |
| Reference Pack (16 images) | `qwen-image-2.0-pro` | 1,504 | 16 × 94 credits |

### Voice

| Feature | Model | Credits | Notes |
|---------|-------|---------|-------|
| TTS (short, < 100 chars) | `qwen3-tts-flash` | 2 | "Hello!" |
| TTS (medium, ~300 chars) | `qwen3-tts-flash` | 5 | Typical response |
| TTS (long, ~1000 chars) | `qwen3-tts-flash` | 17 | Extended narration |
| ASR (30 sec) | `qwen3-asr-flash` | 6 | Voice message transcription |
| ASR (60 sec) | `qwen3-asr-flash` | 6 | Flat rate (min 6 credits) |

### Video

| Feature | Model | Quality | Credits |
|---------|-------|---------|---------|
| 5s Text-to-Video | `wan2.6-i2v-flash` | 720p silent | 125 |
| 5s Text-to-Video | `wan2.6-i2v-flash` | 720p audio | 250 |
| 5s Image-to-Video | `wan2.6-i2v-flash` | 720p silent | 125 |
| 10s Premium Video | `wan2.7-i2v` | 1080p audio | 375+ |

### Story Generation (Autonomous)

| Feature | Cost | Notes |
|---------|------|-------|
| Auto Story (text only) | 3-5 credits | LLM generation + optional image |
| Auto Story (with image) | 97-99 credits | LLM + qwen-image-2.0-pro |
| Auto Story (with video) | 220-350 credits | LLM + wan2.6 video |

---

## Margin Policy

### Policy Configuration (`margin_policies` table)

```
Default Policy:
  targetGrossMargin:    0.75  (75%)
  warningMargin:        0.55  (55%) — alert if margin drops below
  hardMinimumMargin:    0.35  (35%) — block operations below this
```

### Margin Monitoring

```
Gross Margin = (Customer Charge - Provider Cost) / Customer Charge

Example:
  Chat operation: charge 3 credits ($0.003), cost $0.00050
  Margin = ($0.003 - $0.00050) / $0.003 = 83.3% ✅ (above 75% target)

Example (low margin):
  TTS operation: charge 2 credits ($0.002), cost $0.00039
  Margin = ($0.002 - $0.00039) / $0.002 = 80.5% ✅
```

### Alerts

| Condition | Severity | Action |
|-----------|----------|--------|
| Margin < 55% on any operation | Warning | Log alert, notify admin |
| Margin < 35% on any operation | Critical | Block operation, notify admin |
| Provider spend > 80% of reserve | Warning | Review pricing |
| Provider spend spike > 200% normal | Warning | Investigate usage |

### Provider Reserve

The `provider_treasury_accounts` table tracks:

```
reserveTargetMinor     — Minimum reserve target (in currency minor units)
reserveStatus           — healthy / warning / critical
spend24hMinor          — Last 24 hours spend
spend30dMinor          — Last 30 days spend
forecast7dMinor        — Predicted 7-day spend
```

---

## User Pricing Tiers

### Credit Packages

| Package | Credits | Price (EUR) | Per-Credit | Bonus |
|---------|---------|-------------|------------|-------|
| Starter | 500 | €5.00 | €0.010 | — |
| Standard | 1,200 | €10.00 | €0.00833 | +20% bonus |
| Plus | 2,500 | €20.00 | €0.008 | +25% bonus |
| Pro | 5,000 | €35.00 | €0.007 | +40% bonus |
| Ultimate | 15,000 | €90.00 | €0.006 | +50% bonus |

### What You Get Per Package

| Feature | Starter (500) | Standard (1,200) | Plus (2,500) | Pro (5,000) | Ultimate (15,000) |
|---------|:---:|:---:|:---:|:---:|:---:|
| Chat messages | ~150 | ~400 | ~830 | ~1,660 | ~5,000 |
| Standard images | ~11 | ~27 | ~57 | ~113 | ~340 |
| High-quality images | ~5 | ~13 | ~27 | ~53 | ~160 |
| Selfies | ~5 | ~13 | ~27 | ~53 | ~160 |
| TTS (medium) | ~100 | ~240 | ~500 | ~1,000 | ~3,000 |
| 5s Videos | ~4 | ~10 | ~20 | ~40 | ~120 |
| Reference Pack | 0.4 | 1 | 2 | 4 | 13 |

### Subscription Model (Future)

| Tier | Monthly Price | Monthly Credits | Rollover | Bonus Features |
|------|:---:|:---:|:---:|---|
| Free | €0 | 100 | No | 1 character, basic chat |
| Premium | €9.99 | 1,500 | Yes (max 1 month) | 5 characters, priority queue |
| Creator | €24.99 | 5,000 | Yes (max 2 months) | 15 characters, analytics, monetization |
| Unlimited | €49.99 | 15,000 | Yes (max 3 months) | Unlimited chars, API access |

---

## Cost per Operation Breakdown

### User Chat Session (Typical)

```
1 user message → 3 credits
1 AI response → 3 credits
Memory extraction (background) → 1 credit
Relationship update → 0 credits
Auto-react → 0 credits
─────────────────────────────
Total per exchange: ~7 credits

10 exchanges/day × 30 days = 300 exchanges/month
Cost: 2,100 credits/month ≈ €15-€20 in credits
```

### Character Creation (Full)

```
Autofill (LLM)            → 5 credits
Generate 14 ref images     → 1,316 credits (14 × 94)
Identity verification      → 3 credits (LLM check)
─────────────────────────────────────
Total: ~1,324 credits

This is a one-time cost borne by the creator.
At Pro tier (€35 for 5,000 credits), creating one character costs ~€9.27 in credits.
```

### Autonomous Character (Daily)

```
Story generation (text)    → 3 credits
Optional image             → 94 credits
─────────────────────────────────────
Per story: 3-97 credits

Low autonomy (1 story/day): ~90-2,910 credits/month
Medium autonomy (3 stories/day): ~270-8,730 credits/month
High autonomy (6 stories/day): ~540-17,460 credits/month

Autonomous costs are borne by the character creator.
```

### Reference Pack Generation

```
12 images (minimum):    1,128 credits
14 images (standard):   1,316 credits
16 images (maximum):    1,504 credits

Generation is costed to the character creator.
Regeneration (if identity drifts): same cost again.
```

---

## Treasury System

### Account Structure

```
treasury_accounts:
  code: "CASH"          — Real cash balance (top-ups, payments)
  code: "CREDITS_LIABILITY" — Total credits in circulation
  code: "PROVIDER_ACCRUED"  — Estimated provider costs not yet billed
  code: "REVENUE"           — Recognized revenue from credit sales
  code: "COGS"              — Cost of goods sold (provider costs)
  code: "MARGIN"            — Gross profit = REVENUE - COGS

provider_treasury_accounts:
  alibaba:  — Tracks all Alibaba spend, reserves, billing status
```

### Journal Entry Flow

#### User Purchases Credits

```
DEBIT:  CASH               +€10.00 (Stripe payment received)
CREDIT: CREDITS_LIABILITY  +€10.00 (1,200 credits issued)
CREDIT: REVENUE             +€2.00 (immediate revenue recognition)
DEBIT:  REVENUE             -€8.00 (deferred — recognized on usage)
```

#### User Consumes Credits (Chat)

```
DEBIT:  CREDITS_LIABILITY  -€0.003 (3 credits consumed)
CREDIT: REVENUE             +€0.003 (recognized)
DEBIT:  COGS               +€0.00050 (provider cost)
CREDIT: PROVIDER_ACCRUED   +€0.00050 (owed to Alibaba)
```

#### Provider Settlement (Monthly)

```
DEBIT:  PROVIDER_ACCRUED   -$X.XX
CREDIT: CASH                -$X.XX (paid to Alibaba)
```

---

## Margin Guard

### Pre-Generation Check

Before ANY AI generation, the `MarginGuardService` evaluates:

```typescript
function checkGeneration(operation: GenerationRequest): MarginCheck {
  const estimatedProviderCost = getEstimatedCost(model, capability, params);
  const creditCharge = getCreditCost(model, capability, params);
  const retailValue = creditCharge * 0.001; // 1 credit = $0.001
  const margin = (retailValue - estimatedProviderCost) / retailValue;
  
  if (margin < hardMinimumMargin) {
    return { allowed: false, reason: `Margin ${margin.toFixed(2)} below hard minimum ${hardMinimumMargin}` };
  }
  
  if (margin < warningMargin) {
    // Log alert but allow
    createAlert({ type: 'margin_warning', message: `Margin ${margin.toFixed(2)} below warning threshold` });
  }
  
  return { allowed: true, margin, estimatedCost: estimatedProviderCost, chargeCredits: creditCharge };
}
```

### Credit Balance Check

```typescript
function checkBalance(userId: string, requiredCredits: number): BalanceCheck {
  const wallet = await getWallet(userId);
  
  if (wallet.balance < requiredCredits) {
    return { 
      allowed: false, 
      reason: `Insufficient credits: need ${requiredCredits}, have ${wallet.balance}` 
    };
  }
  
  return { allowed: true, balance: wallet.balance, afterOperation: wallet.balance - requiredCredits };
}
```

---

## Usage Tracking

### Provider Usage Events (`provider_usage_events`)

Every AI generation creates a usage event:

```typescript
{
  requestId: "uuid",
  userId: "uuid",
  provider: "alibaba",
  model: "qwen3.5-flash",
  feature: "llm_chat",
  inputTokens: 3000,
  outputTokens: 500,
  quotedCostMinor: 50,       // 0.00050 USD in minor units
  actualCostMinor: 50,       // Confirmed cost
  costCurrency: "USD",
  customerChargeMinor: 300,  // 0.003 USD = 3 credits in minor units
  customerCurrency: "EUR",
  marginPercent: 0.833,      // 83.3%
  status: "completed",
  startedAt: "...",
  completedAt: "..."
}
```

### Credit Ledger

```typescript
{
  userId: "uuid",
  delta: -3,
  balanceAfter: 1247,
  reason: "AI chat",
  referenceType: "generation_job",
  referenceId: "uuid"
}
```

---

## Financial Analytics (Admin)

### Daily Snapshot (`treasury_snapshots`)

Generated daily at midnight UTC:

```typescript
{
  date: "2025-01-15",
  currency: "EUR",
  grossRevenue: 125000,        // €1,250.00
  netRevenue: 115000,          // €1,150.00
  providerAccrued: 18750,      // €187.50 provider costs
  providerSettled: 0,          // Not yet paid
  providerPayable: 18750,      // Total owed to providers
  refundsReserve: 5000,        // 4% of gross for refunds
  taxReserve: 23750,           // 19% VAT reserve
  operatingReserve: 10000,     // Operational costs
  safeWithdrawable: 62500,     // What can safely be withdrawn
  activePaidUsers: 150,
  grossMarginPercent: 0.833    // 83.3%
}
```

### Key Metrics Dashboard

| Metric | Calculation | Target |
|--------|------------|--------|
| Gross Margin | (Revenue - COGS) / Revenue | > 75% |
| ARPU (all users) | Total Revenue / Active Users | > €5 |
| ARPPU (paid users) | Total Revenue / Paid Users | > €15 |
| Credit Consumption Rate | Credits Used / Credits Issued | < 90% |
| Provider Cost Ratio | Provider Costs / Revenue | < 25% |
| Churn Rate | Users inactive 30d / Total Users | < 20% |
| CAC (Customer Acquisition Cost) | Marketing Spend / New Users | < €3 |
| LTV (Lifetime Value) | ARPU × Avg Lifetime | > €50 |

---

## Cost Optimization Strategies

### Tiered Model Selection

| Operation | Default Model | Cheaper Fallback | Trigger |
|-----------|--------------|------------------|---------|
| Chat | `qwen3.5-flash` | `qwen-flash` | Margin below 65% |
| Image | `qwen-image-2.0-pro` | `qwen-image-2.0` | Credit balance low |
| TTS | `qwen3-tts-flash` | — | (only option) |

### Caching Opportunities

- Repeated identical image prompts → serve cached result (no API call)
- System prompts → cache for 24h (don't regenerate)
- Memory extraction → batch process (combine multiple exchanges)

### Future Optimization

- Model quantization (local inference for simple queries with llama.cpp)
- Prompt caching (reuse KV cache for repeated system prompts)
- Image result caching (same prompt + same seed = same image)
- Batch generation (combine multiple image requests)

---

## Implementation

### Core Files

```
packages/ai-core/src/
  costing.ts         — calculateCredits(), getCreditCost(), PRICING table
  providers/
    alibaba.ts       — Alibaba DashScope client

packages/database/src/schema/
  treasury.ts        — All treasury/billing tables
  generations.ts     — generationJobs table

apps/api/src/
  ai/ai.service.ts   — Credit checks + debiting in all AI operations
  usage/
    pricing.service.ts
    margin-guard.service.ts
    usage.service.ts
  treasury/
    treasury.service.ts
```

### Configurable Parameters

```typescript
// packages/config/src/costing.ts
export const CostingConfig = {
  RESERVE_FACTOR: 1.25,
  TARGET_MARGIN: 0.75,
  WARNING_MARGIN: 0.55,
  HARD_MIN_MARGIN: 0.35,
  CREDIT_DENOMINATION: 0.001, // 1 credit = $0.001
  MIN_CREDITS_PER_OP: 2,
};
```
