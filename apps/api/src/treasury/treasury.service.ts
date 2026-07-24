import { Injectable, Logger } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { treasuryJournals, treasuryLedgerEntries, treasuryAccounts, treasurySnapshots, billingAlerts, providerTreasuryAccounts } from '@itchats/database/schema/treasury';
import { eq, desc, and, sql } from 'drizzle-orm';

type LedgerEntry = {
  journalId: string; accountCode: string; direction: 'debit' | 'credit';
  amountMinor: number; currency: string; referenceType?: string; referenceId?: string;
  userId?: string; provider?: string; metadata?: Record<string, any>;
};

@Injectable()
export class TreasuryService {
  private readonly logger = new Logger(TreasuryService.name);

  /** Create an immutable journal with ledger entries */
  async journal(eventType: string, entries: LedgerEntry[], idempotencyKey: string, externalId?: string) {
    const db = getDb();

    // Check idempotency
    const [existing] = await db.select({ id: treasuryJournals.id })
      .from(treasuryJournals).where(eq(treasuryJournals.idempotencyKey, idempotencyKey)).limit(1);
    if (existing) { this.logger.debug(`Duplicate journal skipped: ${idempotencyKey}`); return existing; }

    const [journal] = await db.insert(treasuryJournals).values({
      eventType, externalId, idempotencyKey, occurredAt: new Date(),
    }).returning();
    if (!journal) throw new Error('Failed to create journal');

    for (const e of entries) {
      await db.insert(treasuryLedgerEntries).values({
        journalId: journal.id, accountCode: e.accountCode, direction: e.direction,
        amountMinor: e.amountMinor, currency: e.currency,
        referenceType: e.referenceType, referenceId: e.referenceId,
        userId: e.userId, provider: e.provider, metadata: e.metadata ?? {},
      });
      const delta = e.direction === 'debit' ? e.amountMinor : -e.amountMinor;
      await db.execute(sql`
        INSERT INTO treasury_accounts (code, name, category, balance_minor, currency)
        VALUES (${e.accountCode}, ${e.accountCode}, 'auto', ${delta}, ${e.currency})
        ON CONFLICT (code) DO UPDATE SET balance_minor = treasury_accounts.balance_minor + ${delta}, updated_at = NOW()
      `);
    }
    return journal;
  }

  /** Record customer revenue */
  async recordRevenue(userId: string, amountMinor: number, currency: string, referenceType: string, referenceId: string, stripeFeeMinor: number) {
    const key = `revenue_${referenceType}_${referenceId}`;
    const entries: LedgerEntry[] = [
      { journalId: '', accountCode: 'CUSTOMER_REVENUE', direction: 'credit', amountMinor, currency, referenceType, referenceId, userId },
      { journalId: '', accountCode: 'STRIPE_FEES', direction: 'debit', amountMinor: stripeFeeMinor, currency, referenceType, referenceId },
      { journalId: '', accountCode: 'CASH_LIQUID', direction: 'debit', amountMinor: amountMinor - stripeFeeMinor, currency, referenceType, referenceId },
    ];
    return this.journal('customer_revenue', entries, key);
  }

  /** Record provider cost liability */
  async recordProviderCost(provider: string, userId: string, amountMinor: number, currency: string, referenceType: string, referenceId: string) {
    const key = `provider_cost_${referenceType}_${referenceId}`;
    const entries: LedgerEntry[] = [
      { journalId: '', accountCode: 'PROVIDER_PAYABLE', direction: 'debit', amountMinor, currency, referenceType, referenceId, userId, provider },
      { journalId: '', accountCode: 'PROVIDER_COST_ACCRUED', direction: 'credit', amountMinor, currency, referenceType, referenceId, provider },
    ];
    await this.journal('provider_cost', entries, key);
    await this.updateProviderTreasury(provider, amountMinor);
  }

  /** Settle provider payment */
  async settleProviderPayment(provider: string, amountMinor: number, currency: string, referenceType: string, referenceId: string) {
    const key = `provider_settled_${referenceType}_${referenceId}`;
    const entries: LedgerEntry[] = [
      { journalId: '', accountCode: 'PROVIDER_PAYABLE', direction: 'credit', amountMinor, currency, referenceType, referenceId, provider },
      { journalId: '', accountCode: 'PROVIDER_SETTLED', direction: 'debit', amountMinor, currency, referenceType, referenceId, provider },
      { journalId: '', accountCode: 'CASH_LIQUID', direction: 'credit', amountMinor, currency, referenceType, referenceId },
    ];
    await this.journal('provider_settlement', entries, key);
    const db = getDb();
    await db.update(providerTreasuryAccounts)
      .set({ outstandingPayableMinor: sql`outstanding_payable_minor - ${amountMinor}` } as any)
      .where(eq(providerTreasuryAccounts.provider, provider));
  }

  /** Calculate safe withdrawable amount */
  async getSafeWithdrawable(): Promise<{
    liquidCash: number; providerPayable: number; providerReserve: number;
    refundReserve: number; taxReserve: number; operatingReserve: number;
    safeWithdrawable: number; currency: string;
  }> {
    const db = getDb();
    const accounts = await db.select().from(treasuryAccounts);
    const getBalance = (code: string) => Number(accounts.find(a => a.code === code)?.balanceMinor ?? 0);

    const providers = await db.select().from(providerTreasuryAccounts);
    const providerReserve = providers.reduce((s, p) => s + Number(p.reserveTargetMinor ?? 0), 0);

    const liquidCash = getBalance('CASH_LIQUID') + getBalance('STRIPE_AVAILABLE');
    const providerPayable = getBalance('PROVIDER_PAYABLE');
    const refundReserve = getBalance('REFUND_RESERVE');
    const taxReserve = getBalance('TAX_RESERVE');
    const operatingReserve = getBalance('OPERATING_RESERVE');

    const safeWithdrawable = liquidCash - Math.max(providerPayable, providerReserve) - refundReserve - taxReserve - operatingReserve;

    return {
      liquidCash, providerPayable, providerReserve, refundReserve, taxReserve,
      operatingReserve, safeWithdrawable: Math.max(0, safeWithdrawable), currency: 'EUR',
    };
  }

  /** Daily snapshot */
  async takeSnapshot() {
    const today = new Date().toISOString().slice(0, 10);
    const safe = await this.getSafeWithdrawable();
    const db = getDb();
    await db.insert(treasurySnapshots).values({
      date: today,
      safeWithdrawable: safe.safeWithdrawable,
      providerPayable: safe.providerPayable,
      refundsReserve: safe.refundReserve,
      taxReserve: safe.taxReserve,
      operatingReserve: safe.operatingReserve,
      currency: 'EUR',
    } as any).onConflictDoUpdate({
      target: treasurySnapshots.date,
      set: { safeWithdrawable: safe.safeWithdrawable, updatedAt: new Date() } as any,
    });
    return safe;
  }

  /** Create billing alert */
  async createAlert(type: string, severity: string, title: string, message: string, provider?: string) {
    const db = getDb();
    await db.insert(billingAlerts).values({ type, severity, title, message, provider } as any);
    this.logger.warn(`BILLING ALERT [${severity}]: ${title} — ${message}`);
  }

  private async updateProviderTreasury(provider: string, costDeltaMinor: number) {
    const db = getDb();
    await db.execute(sql`
      INSERT INTO provider_treasury_accounts (provider, display_name, outstanding_payable_minor, spend_24h_minor, spend_30d_minor)
      VALUES (${provider}, ${provider}, ${costDeltaMinor}, ${costDeltaMinor}, ${costDeltaMinor})
      ON CONFLICT (provider) DO UPDATE SET
        outstanding_payable_minor = provider_treasury_accounts.outstanding_payable_minor + ${costDeltaMinor},
        spend_24h_minor = provider_treasury_accounts.spend_24h_minor + ${costDeltaMinor},
        spend_30d_minor = provider_treasury_accounts.spend_30d_minor + ${costDeltaMinor},
        updated_at = NOW()
    `);
  }

  /** Get provider treasury overview */
  async getProviderOverview() {
    const db = getDb();
    const providers = await db.select().from(providerTreasuryAccounts);
    const safe = await this.getSafeWithdrawable();
    const alerts = await db.select().from(billingAlerts).where(eq(billingAlerts.acknowledged, false as any)).orderBy(desc(billingAlerts.createdAt)).limit(10);
    return { providers, safe, alerts };
  }
}
