import { Injectable, Logger } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { subscriptionPlans, userSubscriptions, creditWallets, creditLedger, webhookEvents, usageReservations } from '@itchats/database/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { getConfig } from '@itchats/config';
import { createHash, randomUUID } from 'node:crypto';
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

  /**
   * Seed the default subscription plans into the database.
   * Idempotent: skips plans that already exist.
   * Called on app startup or via admin endpoint.
   */
  async seedDefaultPlans() {
    const db = getDb();
    const defaultPlans = [
      {
        id: 'free',
        name: 'Free',
        monthlyPriceUsd: '0.0000',
        monthlyCredits: 500,
        maxPrivateCharacters: 2,
        maxPublicCharacters: 0,
        maxAutoStoryCharacters: 0,
        capabilities: {
          basicChat: true,
          imageGeneration: 'limited',
          voiceMessages: true,
          feedPosting: true,
          discover: true,
        },
        sortOrder: 1,
      },
      {
        id: 'starter',
        name: 'Starter',
        monthlyPriceUsd: '7.9900',
        monthlyCredits: 3000,
        maxPrivateCharacters: 5,
        maxPublicCharacters: 2,
        maxAutoStoryCharacters: 1,
        capabilities: {
          basicChat: true,
          imageGeneration: true,
          voiceMessages: true,
          feedPosting: true,
          discover: true,
          characterAutonomy: true,
          nsfwFilter: true,
        },
        sortOrder: 2,
      },
      {
        id: 'pro',
        name: 'Pro',
        monthlyPriceUsd: '19.9900',
        monthlyCredits: 15000,
        maxPrivateCharacters: 20,
        maxPublicCharacters: 10,
        maxAutoStoryCharacters: 5,
        capabilities: {
          basicChat: true,
          imageGeneration: true,
          voiceMessages: true,
          feedPosting: true,
          discover: true,
          characterAutonomy: true,
          nsfwFilter: true,
          roleplay: true,
          prioritySupport: true,
          customVoices: true,
        },
        sortOrder: 3,
      },
      {
        id: 'unlimited',
        name: 'Unlimited',
        monthlyPriceUsd: '49.9900',
        monthlyCredits: 75000,
        maxPrivateCharacters: 100,
        maxPublicCharacters: 50,
        maxAutoStoryCharacters: 20,
        capabilities: {
          basicChat: true,
          imageGeneration: true,
          voiceMessages: true,
          feedPosting: true,
          discover: true,
          characterAutonomy: true,
          nsfwFilter: true,
          roleplay: true,
          prioritySupport: true,
          customVoices: true,
          apiAccess: true,
          analytics: true,
        },
        sortOrder: 4,
      },
    ];

    let seeded = 0;
    for (const plan of defaultPlans) {
      const [existing] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, plan.id as any))
        .limit(1);
      if (!existing) {
        await db.insert(subscriptionPlans).values(plan as any);
        seeded++;
      }
    }
    if (seeded > 0) {
      this.logger.log(`Seeded ${seeded} new subscription plans`);
    }
    return { seeded, total: defaultPlans.length };
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

  /**
   * Atomic credit debit with row-level balance guard.
   * Uses SQL GREATEST to ensure balance never goes below 0,
   * and validates the debit can be satisfied before attempting.
   */
  async debitWallet(userId: string, amount: number, reason: string, refType?: string, refId?: string) {
    const db = getDb();
    const wallet = await this.getWallet(userId);
    const balance = Number(wallet.balance ?? 0);
    if (balance < amount) throw new Error(`Insufficient credits: have ${balance}, need ${amount}`);

    // Atomic update: only debit if balance >= amount
    const result = await db.update(creditWallets).set({
      balance: sql`GREATEST(0, ${creditWallets.balance} - ${amount})`,
      lifetimeDebited: sql`${creditWallets.lifetimeDebited} + ${amount}`,
      updatedAt: new Date(),
    } as any).where(
      and(
        eq(creditWallets.userId, userId),
        sql`${creditWallets.balance} >= ${amount}`,
      )
    );

    const newBalance = balance - amount;

    await db.insert(creditLedger).values({
      userId, delta: -amount, balanceAfter: newBalance,
      reason, referenceType: refType, referenceId: refId,
    } as any);

    return { userId, balance: newBalance, debited: amount };
  }

  /**
   * Reserve credits for an async operation.
   * Creates a usage reservation that can be finalized or released.
   */
  async reserveCredits(
    userId: string,
    idempotencyKey: string,
    estimatedCost: number,
    provider: string,
    model: string,
    feature: string,
  ) {
    const db = getDb();

    // Idempotency check
    const [existing] = await db.select().from(usageReservations)
      .where(eq(usageReservations.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existing) {
      return {
        reservationId: existing.id,
        status: existing.status,
        idempotent: true,
      };
    }

    // Check balance
    const wallet = await this.getWallet(userId);
    if (Number(wallet.balance) < estimatedCost) {
      throw new Error(`Insufficient credits for reservation: need ${estimatedCost}, have ${wallet.balance}`);
    }

    const [reservation] = await db.insert(usageReservations).values({
      userId,
      requestId: randomUUID(),
      idempotencyKey,
      provider,
      model,
      feature,
      estimatedProviderCostMinor: Math.round(estimatedCost * 100),
      estimatedCustomerPriceMinor: Math.round(estimatedCost * 100),
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 60_000), // 30 min expiry
    }).returning();

    return { reservationId: reservation!.id, status: 'pending', idempotent: false };
  }

  /**
   * Finalize a reservation after the actual cost is known.
   */
  async finalizeReservation(idempotencyKey: string, actualCost: number) {
    const db = getDb();
    const [reservation] = await db.select().from(usageReservations)
      .where(eq(usageReservations.idempotencyKey, idempotencyKey))
      .limit(1);

    if (!reservation) throw new Error('Reservation not found');
    if (reservation.status === 'completed') return { status: 'already-completed' };

    await db.update(usageReservations).set({
      actualProviderCostMinor: Math.round(actualCost * 100),
      actualCustomerPriceMinor: Math.round(actualCost * 100),
      status: 'completed',
      completedAt: new Date(),
    } as any).where(eq(usageReservations.id, reservation.id));

    // Debit the actual cost
    await this.debitWallet(reservation.userId, actualCost, 'Usage reservation finalized', 'reservation', reservation.id);

    return { status: 'completed' };
  }

  /**
   * Release a reservation without debiting.
   */
  async releaseReservation(idempotencyKey: string) {
    const db = getDb();
    await db.update(usageReservations).set({
      status: 'cancelled',
      completedAt: new Date(),
    } as any).where(eq(usageReservations.idempotencyKey, idempotencyKey));
    return { status: 'cancelled' };
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

  /**
   * Handle Stripe webhook with idempotency guard and retry support.
   *
   * Idempotency: uses webhook_events table keyed on (provider, external_event_id).
   * If the event was already processed successfully, returns 200 immediately.
   *
   * Retry: if processing fails, increments attempt_count and re-throws.
   * Stripe will retry with exponential backoff automatically.
   */
  async handleStripeWebhook(payload: Buffer, signature: string) {
    const stripe = getStripe();
    const config = getConfig();
    const db = getDb();

    if (!stripe || !config.STRIPE_WEBHOOK_SECRET) {
      this.logger.warn('Stripe webhook received but Stripe is not configured');
      return { received: true, mode: 'dev-skip' };
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, config.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      this.logger.error(`Stripe webhook signature verification failed: ${err.message}`);
      throw err;
    }

    const payloadHash = createHash('sha256').update(payload).digest('hex');

    // ── Idempotency guard ──
    try {
      const [existing] = await db.select().from(webhookEvents)
        .where(and(
          eq(webhookEvents.provider, 'stripe'),
          eq(webhookEvents.externalEventId, event.id),
        )).limit(1);

      if (existing && existing.status === 'processed') {
        this.logger.debug(`Webhook ${event.id} already processed (id: ${existing.id})`);
        return { received: true, idempotent: true, type: event.type };
      }

      if (existing) {
        // Previous attempt failed — increment retry counter
        await db.update(webhookEvents).set({
          attemptCount: sql`${webhookEvents.attemptCount} + 1`,
          status: 'retrying',
        } as any).where(eq(webhookEvents.id, existing.id));
      } else {
        // First time seeing this event
        await db.insert(webhookEvents).values({
          provider: 'stripe',
          externalEventId: event.id,
          eventType: event.type,
          payloadHash,
          status: 'received',
          attemptCount: 1,
        });
      }
    } catch (err: any) {
      // If the idempotency insert fails due to a race, that's OK — Stripe will retry
      this.logger.warn(`Webhook idempotency check failed (may be race): ${err.message}`);
    }

    // ── Process the event ──
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const { userId, planId } = session.metadata ?? {};
          if (userId && planId) {
            const subscriptionId = session.subscription as string;

            // Check if subscription already exists (idempotency within processing)
            const [existingSub] = await db.select().from(userSubscriptions)
              .where(eq(userSubscriptions.providerSubscriptionId, subscriptionId))
              .limit(1);

            if (!existingSub) {
              const [plan] = await db.select().from(subscriptionPlans)
                .where(eq(subscriptionPlans.id, planId)).limit(1);

              await db.insert(userSubscriptions).values({
                userId, planId, provider: 'stripe',
                providerSubscriptionId: subscriptionId,
                providerCustomerId: session.customer as string,
                status: 'active',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
              } as any);

              if (plan) {
                await this.creditWallet(
                  userId,
                  Number(plan.monthlyCredits),
                  `Monthly credits: ${plan.name}`,
                  'subscription',
                  subscriptionId,
                );
              }
            }
          }
          break;
        }

        case 'invoice.paid': {
          const invoice = event.data.object as Stripe.Invoice;
          if (invoice.subscription) {
            const [sub] = await db.select().from(userSubscriptions)
              .where(eq(userSubscriptions.providerSubscriptionId, invoice.subscription as string))
              .limit(1);

            if (sub) {
              const [plan] = await db.select().from(subscriptionPlans)
                .where(eq(subscriptionPlans.id, sub.planId)).limit(1);

              if (plan) {
                await this.creditWallet(
                  sub.userId,
                  Number(plan.monthlyCredits),
                  `Monthly credits renewal: ${plan.name}`,
                  'subscription_renewal',
                  invoice.id,
                );
              }

              // Extend the subscription period
              await db.update(userSubscriptions).set({
                currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
                updatedAt: new Date(),
              } as any).where(eq(userSubscriptions.id, sub.id));
            }
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          const [s] = await db.select().from(userSubscriptions)
            .where(eq(userSubscriptions.providerSubscriptionId, sub.id)).limit(1);
          if (s) {
            await db.update(userSubscriptions).set({
              status: 'cancelled', updatedAt: new Date(),
            } as any).where(eq(userSubscriptions.id, s.id));
          }
          break;
        }

        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription;
          const [s] = await db.select().from(userSubscriptions)
            .where(eq(userSubscriptions.providerSubscriptionId, sub.id)).limit(1);
          if (s) {
            const status = sub.status as string;
            await db.update(userSubscriptions).set({
              status: status === 'active' ? 'active' :
                      status === 'past_due' ? 'past_due' :
                      status === 'paused' ? 'paused' : s.status,
              currentPeriodEnd: new Date((sub.current_period_end ?? 0) * 1000),
              updatedAt: new Date(),
            } as any).where(eq(userSubscriptions.id, s.id));
          }
          break;
        }
      }

      // Mark webhook as processed
      await db.update(webhookEvents).set({
        status: 'processed',
        processedAt: new Date(),
      } as any).where(and(
        eq(webhookEvents.provider, 'stripe'),
        eq(webhookEvents.externalEventId, event.id),
      ));

      return { received: true, type: event.type, idempotent: false };
    } catch (err: any) {
      // Mark as failed so Stripe will retry
      this.logger.error(`Stripe webhook processing failed: ${err.message}`);
      await db.update(webhookEvents).set({
        status: 'failed',
        error: String(err.message).slice(0, 500),
      } as any).where(and(
        eq(webhookEvents.provider, 'stripe'),
        eq(webhookEvents.externalEventId, event.id),
      ));
      throw err;
    }
  }
}
