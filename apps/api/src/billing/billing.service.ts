import { Injectable } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { subscriptionPlans, userSubscriptions, creditWallets, creditLedger } from '@itchats/database/schema';
import { eq, sql } from 'drizzle-orm';

@Injectable()
export class BillingService {
  async getPlans() {
    const db = getDb();
    return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.active, true as any)).orderBy(subscriptionPlans.sortOrder);
  }

  async getUserSubscription(userId: string) {
    const db = getDb();
    const [sub] = await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId))
      .limit(1);
    return sub ?? null;
  }

  async getWallet(userId: string) {
    const db = getDb();
    const [wallet] = await db.select().from(creditWallets)
      .where(eq(creditWallets.userId, userId)).limit(1);
    return wallet ?? { userId, balance: 0, lifetimeCredited: 0, lifetimeDebited: 0 };
  }

  async creditWallet(userId: string, amount: number, reason: string, refType?: string, refId?: string) {
    const db = getDb();
    const [wallet] = await db.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);
    const newBalance = (wallet?.balance ?? 0) + amount;

    await db.update(creditWallets).set({
      balance: newBalance,
      lifetimeCredited: (wallet?.lifetimeCredited ?? 0) + amount,
      updatedAt: new Date(),
    }).where(eq(creditWallets.userId, userId));

    await db.insert(creditLedger).values({
      userId, delta: amount, balanceAfter: newBalance, reason,
      referenceType: refType, referenceId: refId,
    });

    return { userId, balance: newBalance, credited: amount };
  }

  async debitWallet(userId: string, amount: number, reason: string, refType?: string, refId?: string) {
    const db = getDb();
    const [wallet] = await db.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);
    const balance = wallet?.balance ?? 0;
    if (balance < amount) throw new Error(`Insufficient credits: have ${balance}, need ${amount}`);

    const newBalance = balance - amount;
    await db.update(creditWallets).set({
      balance: newBalance,
      lifetimeDebited: (wallet?.lifetimeDebited ?? 0) + amount,
      updatedAt: new Date(),
    }).where(eq(creditWallets.userId, userId));

    await db.insert(creditLedger).values({
      userId, delta: -amount, balanceAfter: newBalance, reason,
      referenceType: refType, referenceId: refId,
    });

    return { userId, balance: newBalance, debited: amount };
  }

  async createCheckoutSession(userId: string, planId: string) {
    // TODO: Stripe integration
    return { url: 'https://checkout.stripe.com/pay/...', sessionId: 'cs_...' };
  }

  async handleStripeWebhook(payload: any, signature: string) {
    // TODO: Verify Stripe signature, process events
    return { received: true };
  }
}

// Fix ordering import
import { sql } from 'drizzle-orm';
