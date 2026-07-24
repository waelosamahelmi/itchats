import { Injectable, Logger } from '@nestjs/common';
import { getConfig } from '@itchats/config';

export interface NormalizedUsage {
  inputTokens?: number; outputTokens?: number;
  imageCount?: number; audioSeconds?: number; videoSeconds?: number;
}

export interface ProviderCostResult {
  costMinor: number; currency: string;
  usage: NormalizedUsage; modelUsed: string;
}

@Injectable()
export class AlibabaBillingAdapter {
  private readonly logger = new Logger(AlibabaBillingAdapter.name);

  /** Estimate cost from Alibaba response metadata */
  estimateFromResponse(response: any): ProviderCostResult {
    const usage = response?.usage ?? {};
    return {
      costMinor: 1,
      currency: 'USD',
      usage: {
        inputTokens: usage.input_tokens ?? usage.prompt_tokens ?? 0,
        outputTokens: usage.output_tokens ?? usage.completion_tokens ?? 0,
      },
      modelUsed: response?.model ?? 'unknown',
    };
  }

  /** Normalize raw Alibaba usage response */
  normalizeUsage(raw: any): NormalizedUsage {
    return {
      inputTokens: raw?.usage?.input_tokens ?? raw?.usage?.prompt_tokens ?? 0,
      outputTokens: raw?.usage?.output_tokens ?? raw?.usage?.completion_tokens ?? 0,
      imageCount: raw?.output?.data?.length ?? 0,
    };
  }

  /** Check account health via Alibaba API */
  async getAccountHealth(): Promise<{ status: string; estimatedOutstanding: number; riskLevel: string }> {
    const config = getConfig();
    if (!config.ALIBABA_API_KEY || config.ALIBABA_API_KEY === 'your-alibaba-api-key-here') {
      return { status: 'unknown', estimatedOutstanding: 0, riskLevel: 'low' };
    }
    try {
      const res = await fetch(`${config.ALIBABA_BASE_URL}/dashboard/billing/overview`, {
        headers: { Authorization: `Bearer ${config.ALIBABA_API_KEY}` },
      });
      if (!res.ok) return { status: 'api_error', estimatedOutstanding: 0, riskLevel: 'medium' };
      const data = await res.json() as any;
      return {
        status: 'healthy',
        estimatedOutstanding: data?.outstanding_amount ?? 0,
        riskLevel: (data?.outstanding_amount ?? 0) > 100 ? 'medium' : 'low',
      };
    } catch {
      return { status: 'unavailable', estimatedOutstanding: 0, riskLevel: 'medium' };
    }
  }
}
