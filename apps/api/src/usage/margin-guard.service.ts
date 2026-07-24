import { Injectable, Logger } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { marginPolicies } from '@itchats/database/schema/treasury';
import { eq, and, or, isNull } from 'drizzle-orm';

export interface MarginDecision {
  allowed: boolean;
  margin: number;
  reason?: string;
  severity: 'ok' | 'warning' | 'blocked';
}

@Injectable()
export class MarginGuard {
  private readonly logger = new Logger(MarginGuard.name);

  async evaluate(customerPriceMinor: number, providerCostMinor: number, provider?: string, model?: string, feature?: string): Promise<MarginDecision> {
    if (customerPriceMinor <= 0) return { allowed: false, margin: 0, reason: 'Zero or negative customer price', severity: 'blocked' };
    const margin = (customerPriceMinor - providerCostMinor) / customerPriceMinor;

    const db = getDb();
    const policies = await db.select().from(marginPolicies).where(
      and(
        eq(marginPolicies.isActive, true as any),
        or(isNull(marginPolicies.provider), eq(marginPolicies.provider, provider ?? '')),
        or(isNull(marginPolicies.model), eq(marginPolicies.model, model ?? '')),
      )
    );

    const policy = policies[0] ?? {
      targetGrossMargin: '0.75', warningMargin: '0.55', hardMinimumMargin: '0.35',
    };

    const target = parseFloat(policy.targetGrossMargin as string);
    const warning = parseFloat(policy.warningMargin as string);
    const hardMin = parseFloat(policy.hardMinimumMargin as string);

    if (margin < 0) return { allowed: false, margin, reason: 'Negative margin — blocked', severity: 'blocked' };
    if (margin < hardMin) return { allowed: false, margin, reason: `Margin ${(margin*100).toFixed(1)}% below hard minimum ${(hardMin*100).toFixed(0)}%`, severity: 'blocked' };
    if (margin < warning) return { allowed: true, margin, reason: `Margin ${(margin*100).toFixed(1)}% below warning threshold ${(warning*100).toFixed(0)}%`, severity: 'warning' };
    if (margin < target) return { allowed: true, margin, severity: 'ok' };
    return { allowed: true, margin, severity: 'ok' };
  }

  async setPolicy(name: string, target: number, warning: number, hardMin: number, provider?: string, model?: string) {
    const db = getDb();
    await db.insert(marginPolicies).values({
      name, targetGrossMargin: target.toFixed(4) as any, warningMargin: warning.toFixed(4) as any,
      hardMinimumMargin: hardMin.toFixed(4) as any, provider, model,
    } as any);
    this.logger.log(`Margin policy set: ${name} (target=${(target*100).toFixed(0)}%)`);
  }
}
