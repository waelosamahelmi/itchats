import { pgTable, uuid, text, timestamp, integer, jsonb, numeric, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

export const subscriptionStatusEnum = pgEnum('subscription_status', ['trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired']);

export const subscriptionPlans = pgTable('subscription_plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  monthlyPriceUsd: numeric('monthly_price_usd', { precision: 12, scale: 4 }).notNull(),
  monthlyCredits: integer('monthly_credits').notNull(),
  maxPrivateCharacters: integer('max_private_characters').notNull(),
  maxPublicCharacters: integer('max_public_characters').notNull(),
  maxAutoStoryCharacters: integer('max_auto_story_characters').notNull(),
  capabilities: jsonb('capabilities').notNull().default('{}'),
  active: text('active').notNull().default('true'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userSubscriptions = pgTable('user_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  planId: text('plan_id').notNull().references(() => subscriptionPlans.id),
  provider: text('provider').notNull().default('stripe'),
  providerCustomerId: text('provider_customer_id'),
  providerSubscriptionId: text('provider_subscription_id').unique(),
  status: subscriptionStatusEnum('status').notNull(),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  cancelAtPeriodEnd: text('cancel_at_period_end').notNull().default('false'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const creditWallets = pgTable('credit_wallets', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  lifetimeCredited: integer('lifetime_credited').notNull().default(0),
  lifetimeDebited: integer('lifetime_debited').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const creditLedger = pgTable('credit_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  delta: integer('delta').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  reason: text('reason').notNull(),
  referenceType: text('reference_type'),
  referenceId: uuid('reference_id'),
  metadata: jsonb('metadata').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
