/**
 * Financial Model — ItChats Monetization
 *
 * Calculates per-user cost estimates, revenue projections, and profit analysis
 * across all subscription tiers and usage patterns.
 *
 * All costs in USD. Credits valued at $0.001 retail (1 credit = $0.001).
 * Target gross margin: 75% on all AI operations.
 */

// ─── Usage Assumptions (Daily Averages per User) ───

export interface DailyUsage {
  /** Messages per day (user + AI response = 1 exchange) */
  chatExchanges: number;
  /** Average input tokens per exchange */
  chatInputTokens: number;
  /** Average output tokens per exchange */
  chatOutputTokens: number;
  /** Standard images generated per day */
  standardImages: number;
  /** Pro/high-quality images generated per day */
  proImages: number;
  /** TTS utterances per day */
  ttsUtterances: number;
  /** Average characters per TTS utterance */
  ttsCharsPerUtterance: number;
  /** ASR transcriptions per day */
  asrTranscriptions: number;
  /** Average seconds per ASR transcription */
  asrSecondsPerTranscription: number;
  /** Videos generated per month */
  videosPerMonth: number;
  /** Average video duration in seconds */
  videoSeconds: number;
}

/**
 * USAGE_PROFILES: Realistic daily averages per user.
 *
 * IMAGE GENERATION IS THE DOMINANT COST (85-95% of total per-user cost):
 *   - Character selfies during chat (1 per ~5 exchanges, pro image = $0.075 each)
 *   - AI profile pictures (pro image = $0.075 each)
 *   - Autonomous feed posts with images (standard = $0.035 or pro = $0.075)
 *   - Character story images (standard = $0.035 or pro = $0.075)
 *
 * Video ($0.025-0.15/sec) is the second-highest per-unit cost.
 * Chat (LLM tokens at $0.10-0.40/M) is negligible by comparison.
 * TTS ($0.13/10K chars) and ASR ($0.000035/sec) are also minimal.
 */
export const USAGE_PROFILES: Record<'free' | 'starter' | 'pro' | 'unlimited', DailyUsage> = {
  free: {
    chatExchanges: 10,           // limited free tier
    chatInputTokens: 350,
    chatOutputTokens: 150,
    standardImages: 0.05,        // almost no image gen on free
    proImages: 0,                // no pro images on free
    ttsUtterances: 1,
    ttsCharsPerUtterance: 150,
    asrTranscriptions: 0.5,
    asrSecondsPerTranscription: 15,
    videosPerMonth: 0,
    videoSeconds: 5,
  },
  starter: {
    chatExchanges: 25,
    chatInputTokens: 450,
    chatOutputTokens: 250,
    standardImages: 3,           // 1 char: ~3 autonomous/story images/day
    proImages: 1.5,              // selfies (~1 per 5 exchanges) + occasional profile updates
    ttsUtterances: 4,
    ttsCharsPerUtterance: 250,
    asrTranscriptions: 2,
    asrSecondsPerTranscription: 20,
    videosPerMonth: 2,           // occasional video in chat/stories
    videoSeconds: 5,
  },
  pro: {
    chatExchanges: 40,
    chatInputTokens: 500,
    chatOutputTokens: 300,
    standardImages: 8,           // multiple chars: selfies + stories + autonomous posts
    proImages: 5,                // profile pics, premium selfies, feed images
    ttsUtterances: 8,
    ttsCharsPerUtterance: 280,
    asrTranscriptions: 4,
    asrSecondsPerTranscription: 25,
    videosPerMonth: 5,
    videoSeconds: 6,
  },
  unlimited: {
    chatExchanges: 60,
    chatInputTokens: 550,
    chatOutputTokens: 400,
    standardImages: 15,          // heavy multi-character usage
    proImages: 10,               // lots of pro images
    ttsUtterances: 15,
    ttsCharsPerUtterance: 350,
    asrTranscriptions: 8,
    asrSecondsPerTranscription: 35,
    videosPerMonth: 12,
    videoSeconds: 8,
  },
};

// ─── Provider Pricing (Alibaba DashScope) ───

export const PROVIDER_PRICES = {
  chat: { inputPer1M: 0.10, outputPer1M: 0.40 }, // qwen3.5-flash (default)
  imageStandard: 0.035,   // qwen-image-2.0
  imagePro: 0.075,        // qwen-image-2.0-pro
  ttsPer10K: 0.13,        // qwen3-tts-flash
  asrPerSecond: 0.000035, // qwen3-asr-flash
  videoPerSecond: 0.025,  // wan2.6-i2v-flash 720p silent
} as const;

// ─── Cost Calculations ───

export interface MonthlyCost {
  chatCost: number;
  imageCost: number;
  ttsCost: number;
  asrCost: number;
  videoCost: number;
  totalCost: number;
}

export function calculateMonthlyProviderCost(usage: DailyUsage, daysInMonth = 30): MonthlyCost {
  // Chat
  const chatCostPerExchange =
    (usage.chatInputTokens * PROVIDER_PRICES.chat.inputPer1M +
      usage.chatOutputTokens * PROVIDER_PRICES.chat.outputPer1M) /
    1_000_000;
  const chatCost = chatCostPerExchange * usage.chatExchanges * daysInMonth;

  // Images
  const imageCost =
    (usage.standardImages * PROVIDER_PRICES.imageStandard +
      usage.proImages * PROVIDER_PRICES.imagePro) *
    daysInMonth;

  // TTS
  const ttsCost =
    (usage.ttsUtterances * usage.ttsCharsPerUtterance * PROVIDER_PRICES.ttsPer10K) /
    10_000 *
    daysInMonth;

  // ASR
  const asrCost =
    usage.asrTranscriptions *
    usage.asrSecondsPerTranscription *
    PROVIDER_PRICES.asrPerSecond *
    daysInMonth;

  // Video (monthly)
  const videoCost = usage.videosPerMonth * usage.videoSeconds * PROVIDER_PRICES.videoPerSecond;

  const totalCost = chatCost + imageCost + ttsCost + asrCost + videoCost;

  return { chatCost, imageCost, ttsCost, asrCost, videoCost, totalCost };
}

/**
 * Calculate the retail credit value of a monthly cost at the target margin.
 * Formula: credits = providerCost * reserveFactor / (1 - targetMargin) / creditValue
 */
export function costToCredits(
  providerCost: number,
  reserveFactor = 1.25,
  targetMargin = 0.75,
  creditValue = 0.001,
): number {
  const retailValue = (providerCost * reserveFactor) / (1 - targetMargin);
  return Math.ceil(retailValue / creditValue);
}

/**
 * Calculate our effective cost per credit based on the operation mix.
 * This varies because different operations have slightly different margins
 * due to the ceil() in credit calculation.
 */
export function effectiveCostPerCredit(usage: DailyUsage): number {
  const cost = calculateMonthlyProviderCost(usage, 1); // single day
  const exchanges = usage.chatExchanges;
  const images = usage.standardImages + usage.proImages;
  const avgImageCost =
    images > 0
      ? (usage.standardImages * PROVIDER_PRICES.imageStandard +
          usage.proImages * PROVIDER_PRICES.imagePro) /
        images
      : PROVIDER_PRICES.imageStandard;

  // Estimate credits used in a day
  const chatCredits = exchanges * costToCredits(cost.chatCost / exchanges);
  const imageCredits = images * costToCredits(avgImageCost);
  const ttsCredits = usage.ttsUtterances * costToCredits((usage.ttsCharsPerUtterance * PROVIDER_PRICES.ttsPer10K) / 10_000);
  const asrCredits = usage.asrTranscriptions * costToCredits(usage.asrSecondsPerTranscription * PROVIDER_PRICES.asrPerSecond);

  const totalCredits = chatCredits + imageCredits + ttsCredits + asrCredits;
  return totalCredits > 0 ? cost.totalCost / totalCredits : 0;
}

// ─── Tier Analysis ───

export interface TierAnalysis {
  tier: string;
  monthlyPrice: number;
  monthlyCredits: number;
  ourCostPerMonth: number;
  revenuePerMonth: number;
  profitPerMonth: number;
  marginPercent: number;
  creditUtilization: number; // % of credits actually used
}

export function analyzeTier(
  tierKey: string,
  monthlyPrice: number,
  monthlyCredits: number,
  usage: DailyUsage,
  creditUtilization = 1.0,
): TierAnalysis {
  const cost = calculateMonthlyProviderCost(usage);
  const ourCost = cost.totalCost;

  // Adjust for credit utilization
  const adjustedCost = ourCost * creditUtilization;

  const profit = monthlyPrice - adjustedCost;
  const margin = monthlyPrice > 0 ? (profit / monthlyPrice) * 100 : 0;

  return {
    tier: tierKey,
    monthlyPrice,
    monthlyCredits,
    ourCostPerMonth: round2(adjustedCost),
    revenuePerMonth: monthlyPrice,
    profitPerMonth: round2(profit),
    marginPercent: round2(margin),
    creditUtilization,
  };
}

// ─── Scale Projections ───

export interface ScaleProjection {
  userCount: number;
  freeUsers: number;
  paidUsers: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  blendedMargin: number;
}

export function projectScale(
  userCount: number,
  analyses: TierAnalysis[],
  distribution: Record<string, number>, // e.g. { free: 0.6, starter: 0.25, pro: 0.10, unlimited: 0.05 }
): ScaleProjection {
  let totalRevenue = 0;
  let totalCost = 0;
  let paidUsers = 0;
  let freeUsers = 0;

  for (const [tier, fraction] of Object.entries(distribution)) {
    const count = Math.round(userCount * fraction);
    const analysis = analyses.find((a) => a.tier === tier);
    if (!analysis) continue;

    if (tier === 'free') {
      freeUsers += count;
    } else {
      paidUsers += count;
    }

    totalRevenue += analysis.revenuePerMonth * count;
    totalCost += analysis.ourCostPerMonth * count;
  }

  const totalProfit = totalRevenue - totalCost;
  const blendedMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return {
    userCount,
    freeUsers,
    paidUsers,
    totalRevenue: round2(totalRevenue),
    totalCost: round2(totalCost),
    totalProfit: round2(totalProfit),
    blendedMargin: round2(blendedMargin),
  };
}

// ─── Sensitivity Analysis ───

export interface SensitivityResult {
  scenario: string;
  costMultiplier: number;
  usageMultiplier: number;
  analyses: TierAnalysis[];
}

export function sensitivityAnalysis(
  analyses: TierAnalysis[],
  scenarios: { name: string; costMult: number; usageMult: number }[],
): SensitivityResult[] {
  return scenarios.map((s) => {
    // Adjust analyses for sensitivity
    const adjusted = analyses.map((a) => ({
      ...a,
      ourCostPerMonth: round2(a.ourCostPerMonth * s.costMult * s.usageMult),
      profitPerMonth: round2(a.revenuePerMonth - a.ourCostPerMonth * s.costMult * s.usageMult),
      marginPercent: round2(
        a.revenuePerMonth > 0
          ? ((a.revenuePerMonth - a.ourCostPerMonth * s.costMult * s.usageMult) / a.revenuePerMonth) * 100
          : 0,
      ),
    }));
    return { scenario: s.name, costMultiplier: s.costMult, usageMultiplier: s.usageMult, analyses: adjusted };
  });
}

// ─── Utilities ───

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Generate a full financial report as a structured object.
 */
export function generateFinancialReport() {
  const tiers = [
    {
      key: 'free',
      name: 'Free',
      price: 0,
      credits: 500,
      utilization: 0.3,
    },
    {
      key: 'starter',
      name: 'Starter',
      price: 7.99,
      credits: 3_000,
      utilization: 0.55,
    },
    {
      key: 'pro',
      name: 'Pro',
      price: 19.99,
      credits: 15_000,
      utilization: 0.6,
    },
    {
      key: 'unlimited',
      name: 'Unlimited',
      price: 49.99,
      credits: 75_000,
      utilization: 0.7,
    },
  ];

  const analyses = tiers.map((t) => {
    const usage = USAGE_PROFILES[t.key as keyof typeof USAGE_PROFILES] ?? USAGE_PROFILES.free;
    return analyzeTier(t.key, t.price, t.credits, usage, t.utilization);
  });

  // Scale projections
  const realisticDistribution = {
    free: 0.60,
    starter: 0.25,
    pro: 0.10,
    unlimited: 0.05,
  };

  const scales = [100, 1_000, 10_000, 100_000].map((count) =>
    projectScale(count, analyses, realisticDistribution),
  );

  // Sensitivity
  const sensitivityScenarios = [
    { name: 'Base case', costMult: 1.0, usageMult: 1.0 },
    { name: 'Cost +20%', costMult: 1.2, usageMult: 1.0 },
    { name: 'Usage +50%', costMult: 1.0, usageMult: 1.5 },
    { name: 'Worst case (cost +30%, usage +100%)', costMult: 1.3, usageMult: 2.0 },
  ];

  const sensitivity = sensitivityAnalysis(analyses, sensitivityScenarios);

  return {
    generatedAt: new Date().toISOString(),
    analyses,
    scaleProjections: scales,
    sensitivity,
  };
}
