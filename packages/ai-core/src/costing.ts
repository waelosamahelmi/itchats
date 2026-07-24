import { z } from 'zod';

export function calculateCredits(providerCostUsd: number, reserveFactor = 1.25, targetMargin = 0.75): number {
  const retailValue = providerCostUsd * reserveFactor / (1 - targetMargin);
  return Math.ceil(retailValue / 0.001);
}

export const PRICING = {
  // Chat models per 1M tokens
  'qwen3.5-flash': { input: 0.10, output: 0.40 },
  'qwen3.6-flash': { input: 0.25, output: 1.50 },
  'deepseek-v4-flash': { input: 0.20, output: 0.40 },
  'qwen-flash': { input: 0.05, output: 0.40 },

  // Image models per image
  'qwen-image-2.0': 0.035,
  'qwen-image-2.0-pro': 0.075,
  'qwen-image-edit-plus': 0.03,
  'wan2.2-t2i-plus': 0.05,
  'wan2.6-t2i': 0.03,

  // Video per second
  'wan2.6-i2v-flash': { '720p_silent': 0.025, '720p_audio': 0.05, '1080p_silent': 0.0375, '1080p_audio': 0.075 },
  'wan2.7-i2v': { '720p_audio': 0.10, '1080p_audio': 0.15 },

  // TTS per 10K chars
  'qwen3-tts-flash': 0.13,
  'qwen3-tts-flash-realtime': 0.13,

  // ASR per second
  'qwen3-asr-flash': 0.000035,

  // Embedding per 1M tokens
  'text-embedding-v4': 0.07,
} as const;

export function getEstimatedCost(model: string, capability: string, params: Record<string, number> = {}): number {
  const pricing = PRICING[model as keyof typeof PRICING];
  if (!pricing) return 0.01;

  switch (capability) {
    case 'llm_chat': {
      const p = pricing as { input: number; output: number };
      const inputTokens = params.inputTokens ?? 2000;
      const outputTokens = params.outputTokens ?? 300;
      return (p.input * inputTokens + p.output * outputTokens) / 1_000_000;
    }
    case 'text_to_image':
    case 'image_to_image':
      return (pricing as number);
    case 'text_to_video':
    case 'image_to_video': {
      const p = pricing as Record<string, number>;
      const seconds = params.seconds ?? 5;
      const quality = params.quality ?? '720p';
      const hasAudio = params.hasAudio ?? false;
      const key = hasAudio ? `${quality}_audio` : `${quality}_silent`;
      return (p[key] ?? p['720p_silent'] ?? 0.025) * seconds;
    }
    case 'tts': {
      const chars = params.chars ?? 300;
      return (pricing as number) * chars / 10_000;
    }
    case 'asr': {
      const seconds = params.seconds ?? 30;
      return (pricing as number) * seconds;
    }
    case 'embedding': {
      const tokens = params.tokens ?? 500;
      return (pricing as number) * tokens / 1_000_000;
    }
    default:
      return 0.01;
  }
}

export function getCreditCost(model: string, capability: string, params: Record<string, number> = {}): number {
  const providerCost = getEstimatedCost(model, capability, params);
  const credits = calculateCredits(providerCost);
  return Math.max(credits, 2); // Minimum 2 credits
}
