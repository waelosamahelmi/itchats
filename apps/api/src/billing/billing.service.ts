import { Injectable, Logger } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { subscriptionPlans, userSubscriptions, creditWallets, creditLedger } from '@itchats/database/schema';
import { eq, desc } from 'drizzle-orm';
import { getConfig } from '@itchats/config';
import Stripe from 'stripe';

let _stripe: Stripe | null = null;
function getStripe(): Stripe | null {
  const config = getConfig();
  if (!config.STRIPE_SECRET_KEY || config.STRIPE_SECRET_KEY === 'sk_test_...') return null;
  if (!_stripe) _stripe = new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2025-06-15.basil' as any });
  return _stripe;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  async getPlans() {
    const db = getDb();
    return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.active, true as any)).orderBy(subscriptionPlans.sortOrder ?? desc(subscriptionPlans.createdAt));
  }

  async getUserSubscription(userId: string) {
    const db = getDb();
    const [sub] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId)).limit(1);
    return sub ?? null;
  }

  async getWallet(userId: string) {
    const db = getDb();
    const [wallet] = await db.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);
    if (!wallet) {
      await db.insert(creditWallets).values({ userId, balance: 0 });
      return { userId, balance: 0, lifetimeCredited: 0, lifetimeDebited: 0 };
    }
    return wallet;
  }

  async creditWallet(userId: string, amount: number, reason: string, refType?: string, refId?: string) {
    const db = getDb();
    const wallet = await this.getWallet(userId);
    const newBalance = Number(wallet.balance) + amount;
    await db.update(creditWallets).set({
      balance: newBalance,
      lifetimeCredited: Number(wallet.lifetimeCredited ?? 0) + amount,
      updatedAt: new Date(),
    } as any).where(eq(creditWallets.userId, userId));
    await db.insert(creditLedger).values({ userId, delta: amount, balanceAfter: newBalance, reason, referenceType: refType, referenceId: refId } as any);
    return { userId, balance: newBalance, credited: amount };
  }

  async debitWallet(userId: string, amount: number, reason: string, refType?: string, refId?: string) {
    const db = getDb();
    const wallet = await this.getWallet(userId);
    const balance = Number(wallet.balance ?? 0);
    if (balance < amount) throw new Error(`Insufficient credits: have ${balance}, need ${amount}`);
    const newBalance = balance - amount;
    await db.update(creditWallets).set({
      balance: newBalance,
      lifetimeDebited: Number(wallet.lifetimeDebited ?? 0) + amount,
      updatedAt: new Date(),
    } as any).where(eq(creditWallets.userId, userId));
    await db.insert(creditLedger).values({ userId, delta: -amount, balanceAfter: newBalance, reason, referenceType: refType, referenceId: refId } as any);
    return { userId, balance: newBalance, debited: amount };
  }

  async createCheckoutSession(userId: string, planId: string, customerEmail: string) {
    const stripe = getStripe();
    const db = getDb();
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1);
    if (!plan) throw new Error('Plan not found');
    if (!stripe) {
      // Development fallback — simulate checkout
      this.logger.warn(`Stripe not configured — simulating checkout for plan ${planId}`);
      const fakeSessionId = `cs_dev_${Date.now()}`;
      await db.insert(userSubscriptions).values({
        userId, planId, provider: 'stripe', providerSubscriptionId: fakeSessionId,
        status: 'active', currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      } as any);
      await this.creditWallet(userId, Number(plan.monthlyCredits), `Monthly credits: ${plan.name}`, 'subscription');
      return { url: null, sessionId: fakeSessionId, message: 'Dev mode — subscription activated immediately' };
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: customerEmail,
      line_items: [{ price_data: {
        currency: 'usd',
        product_data: { name: `ItChats ${plan.name}` },
        unit_amount: Math.round(Number(plan.monthlyPriceUsd) * 100),
        recurring: { interval: 'month' as const },
      }, quantity: 1 }],
      metadata: { userId, planId },
      success_url: `${getConfig().CORS_ORIGIN}/billing?success=1`,
      cancel_url: `${getConfig().CORS_ORIGIN}/billing?canceled=1`,
    });
    return { url: session.url, sessionId: session.id };
  }

  async handleStripeWebhook(payload: Buffer, signature: string) {
    const stripe = getStripe();
    const config = getConfig();
    if (!stripe || !config.STRIPE_WEBHOOK_SECRET) {
      this.logger.warn('Stripe webhook received but Stripe is not configured');
      return { received: true, mode: 'dev-skip' };
    }
    try {
      const event = stripe.webhooks.constructEvent(payload, signature, config.STRIPE_WEBHOOK_SECRET);
      const db = getDb();
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const { userId, planId } = session.metadata ?? {};
          if (userId && planId) {
            const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1);
            await db.insert(userSubscriptions).values({
              userId, planId, provider: 'stripe', providerSubscriptionId: session.subscription as string,
              status: 'active', currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
            } as any);
            if (plan) await this.creditWallet(userId, Number(plan.monthlyCredits), `Monthly credits: ${plan.name}`, 'subscription');
          }
          break;
        }
        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          const [s] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.providerSubscriptionId, sub.id)).limit(1);
          if (s) await db.update(userSubscriptions).set({ status: 'cancelled' } as any).where(eq(userSubscriptions.id, s.id));
          break;
        }
      }
      return { received: true, type: event.type };
    } catch (err: any) {
      this.logger.error(`Stripe webhook error: ${err.message}`);
      throw err;
    }
  }
}
