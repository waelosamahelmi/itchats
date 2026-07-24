import { Injectable } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { usageReservations, providerUsageEvents } from '@itchats/database/schema/treasury';
import { eq, and, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { TreasuryService } from '../treasury/treasury.service';

@Injectable()
export class UsageService {
  constructor(private readonly treasury: TreasuryService) {}

  /** Create a usage reservation before provider execution */
  async reserve(userId: string, provider: string, model: string, feature: string,
    estimatedProviderCostMinor: number, estimatedCustomerPriceMinor: number,
    idempotencyKey: string, ttlSeconds = 300,
  ) {
    const db = getDb();
    const [existing] = await db.select().from(usageReservations)
      .where(and(eq(usageReservations.userId, userId), eq(usageReservations.idempotencyKey, idempotencyKey))).limit(1);
    if (existing) return existing;

    const [reservation] = await db.insert(usageReservations).values({
      userId, requestId: randomUUID(), idempotencyKey, provider, model, feature,
      estimatedProviderCostMinor, estimatedCustomerPriceMinor,
      status: 'pending', expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    }).returning();
    return reservation!;
  }

  /** Finalize a usage reservation with actual costs */
  async finalize(reservationId: string, actualProviderCostMinor: number, actualCustomerPriceMinor: number,
    usage: { inputTokens?: number; outputTokens?: number; imageCount?: number; audioMs?: number },
  ) {
    const db = getDb();
    const [res] = await db.select().from(usageReservations).where(eq(usageReservations.id, reservationId)).limit(1);
    if (!res || res.status === 'completed') return res;

    await db.update(usageReservations).set({
      status: 'completed', actualProviderCostMinor, actualCustomerPriceMinor, completedAt: new Date(),
    } as any).where(eq(usageReservations.id, reservationId));

    // Record provider usage event
    const margin = actualCustomerPriceMinor > 0
      ? ((actualCustomerPriceMinor - actualProviderCostMinor) / actualCustomerPriceMinor * 100)
      : 0;

    await db.insert(providerUsageEvents).values({
      requestId: res.requestId, userId: res.userId, provider: res.provider, model: res.model,
      feature: res.feature, inputTokens: usage.inputTokens ? BigInt(usage.inputTokens) : null,
      outputTokens: usage.outputTokens ? BigInt(usage.outputTokens) : null,
      imageCount: usage.imageCount ?? null,
      actualCostMinor: actualProviderCostMinor, costCurrency: 'EUR',
      customerChargeMinor: actualCustomerPriceMinor, customerCurrency: 'EUR',
      marginPercent: margin.toFixed(3) as any, status: 'completed', startedAt: res.createdAt, completedAt: new Date(),
    } as any);

    // Record treasury entries
    await this.treasury.recordProviderCost(res.provider, res.userId, actualProviderCostMinor, 'EUR', 'usage', res.requestId);

    return { reservationId, status: 'completed', actualProviderCostMinor, actualCustomerPriceMinor };
  }

  /** Cancel / fail a reservation */
  async cancel(reservationId: string, reason: string) {
    const db = getDb();
    await db.update(usageReservations).set({ status: 'cancelled', metadata: { reason } } as any)
      .where(eq(usageReservations.id, reservationId));
    return { cancelled: true };
  }

  /** List user's recent usage */
  async getUserUsage(userId: string, limit = 50) {
    const db = getDb();
    return db.select().from(providerUsageEvents)
      .where(eq(providerUsageEvents.userId, userId))
      .orderBy(sql`started_at DESC`).limit(limit);
  }
}
