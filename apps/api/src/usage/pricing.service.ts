import { Injectable } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { providerPrices } from '@itchats/database/schema/treasury';
import { eq, and, desc, isNull } from 'drizzle-orm';

export interface CostInput {
  provider: string; model: string; operation: string;
  inputTokens?: number; outputTokens?: number; imageCount?: number;
  audioSeconds?: number; videoSeconds?: number;
}

@Injectable()
export class PricingService {
  /** Estimate provider cost from current price catalog */
  async estimateProviderCost(input: CostInput): Promise<{ costMinor: number; currency: string; pricingId: string }> {
    const db = getDb();
    const [price] = await db.select().from(providerPrices)
      .where(and(
        eq(providerPrices.provider, input.provider),
        eq(providerPrices.model, input.model),
        eq(providerPrices.operation, input.operation),
        eq(providerPrices.isActive, true as any),
        isNull(providerPrices.effectiveUntil),
      )).orderBy(desc(providerPrices.effectiveFrom)).limit(1);

    if (!price) return { costMinor: 1, currency: 'USD', pricingId: 'fallback' };

    let costMinor = 0;
    const inputPrice = parseFloat(price.inputPrice as string);
    const outputPrice = parseFloat((price.outputPrice ?? '0') as string);
    const minCharge = parseFloat(price.minimumCharge as string);

    if (input.inputTokens) costMinor += (input.inputTokens / 1_000_000) * inputPrice * 1_000_000;
    if (input.outputTokens) costMinor += (input.outputTokens / 1_000_000) * outputPrice * 1_000_000;
    if (input.imageCount) costMinor += input.imageCount * inputPrice * 1_000_000;
    if (input.audioSeconds) costMinor += input.audioSeconds * (inputPrice / 60) * 1_000_000;

    costMinor = Math.round(Math.max(costMinor, minCharge * 1_000_000));
    return { costMinor, currency: price.currency, pricingId: price.id };
  }

  /** Calculate customer price from provider cost using margin multiplier */
  calculateCustomerPrice(providerCostMinor: number, marginMultiplier: number = 5, minChargeMinor: number = 2): number {
    const raw = Math.ceil(providerCostMinor * marginMultiplier);
    return Math.max(raw, minChargeMinor);
  }

  /** Seed Alibaba pricing catalog */
  async seedAlibabaPricing() {
    const db = getDb();
    const now = new Date();
    const prices = [
      { model: 'qwen3.5-flash', op: 'chat', inp: '0.10', out: '0.40' },
      { model: 'qwen3.6-flash', op: 'chat', inp: '0.25', out: '1.50' },
      { model: 'deepseek-v4-flash', op: 'chat', inp: '0.20', out: '0.40' },
      { model: 'qwen-image-2.0', op: 'image', inp: '0.035', out: null },
      { model: 'qwen-image-2.0-pro', op: 'image', inp: '0.075', out: null },
      { model: 'wan2.6-i2v-flash', op: 'video', inp: '0.025', out: null },
      { model: 'text-embedding-v4', op: 'embedding', inp: '0.07', out: null },
    ];
    for (const p of prices) {
      await db.insert(providerPrices).values({
        provider: 'alibaba', model: p.model, operation: p.op,
        currency: 'USD', inputUnit: p.op === 'image' ? 'image' : p.op === 'video' ? 'second' : '1M tokens',
        inputPrice: p.inp as any,
        outputPrice: p.out ? (p.out as any) : '0' as any,
        effectiveFrom: now, isActive: true, verifiedAt: now, source: 'plan.md §15',
        minimumCharge: '0.0001' as any,
      } as any).onConflictDoNothing();
    }
  }
}
