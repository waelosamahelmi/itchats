import { pgTable, uuid, text, bigint, timestamp, jsonb, varchar, numeric, unique, index, boolean, check, integer } from 'drizzle-orm/pg-core';

// ── Treasury Core ──
export const treasuryJournals = pgTable('treasury_journals', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventType: text('event_type').notNull(),
  externalId: text('external_id'),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb('metadata').notNull().default({}),
});

export const treasuryLedgerEntries = pgTable('treasury_ledger_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  journalId: uuid('journal_id').notNull().references(() => treasuryJournals.id),
  accountCode: text('account_code').notNull(),
  direction: text('direction').notNull(),
  amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  userId: uuid('user_id'),
  provider: text('provider'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  check('direction_check', table.direction.in(['debit', 'credit'])),
  check('amount_positive', table.amountMinor >= 0),
]);

export const treasuryAccounts = pgTable('treasury_accounts', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  balanceMinor: bigint('balance_minor', { mode: 'number' }).notNull().default(0),
  currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb('metadata').notNull().default({}),
});

// ── Provider Treasury ──
export const providerTreasuryAccounts = pgTable('provider_treasury_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull().unique(),
  displayName: text('display_name').notNull(),
  settlementMode: text('settlement_mode').notNull().default('provider_auto_charge'),
  billingCurrency: varchar('currency', { length: 3 }).notNull().default('USD'),
  estimatedUnbilledCostMinor: bigint('estimated_unbilled_cost_minor', { mode: 'number' }).notNull().default(0),
  confirmedBilledCostMinor: bigint('confirmed_billed_cost_minor', { mode: 'number' }).notNull().default(0),
  outstandingPayableMinor: bigint('outstanding_payable_minor', { mode: 'number' }).notNull().default(0),
  spend24hMinor: bigint('spend_24h_minor', { mode: 'number' }).notNull().default(0),
  spend30dMinor: bigint('spend_30d_minor', { mode: 'number' }).notNull().default(0),
  forecast7dMinor: bigint('forecast_7d_minor', { mode: 'number' }).notNull().default(0),
  reserveTargetMinor: bigint('reserve_target_minor', { mode: 'number' }).notNull().default(0),
  reserveStatus: text('reserve_status').notNull().default('healthy'),
  accountStatus: text('account_status').notNull().default('active'),
  lastReconciledAt: timestamp('last_reconciled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb('metadata').notNull().default({}),
});

// ── Provider Pricing (versioned) ──
export const providerPrices = pgTable('provider_prices', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  operation: text('operation').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  inputUnit: text('input_unit').notNull(),
  inputPrice: numeric('input_price', { precision: 24, scale: 12 }).notNull(),
  outputUnit: text('output_unit'),
  outputPrice: numeric('output_price', { precision: 24, scale: 12 }),
  minimumCharge: numeric('minimum_charge', { precision: 24, scale: 12 }).notNull().default('0'),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  effectiveUntil: timestamp('effective_until', { withTimezone: true }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  source: text('source'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Provider Usage Events ──
export const providerUsageEvents = pgTable('provider_usage_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id').notNull(),
  userId: uuid('user_id'),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  feature: text('feature').notNull(),
  providerRequestId: text('provider_request_id'),
  inputTokens: bigint('input_tokens', { mode: 'number' }),
  outputTokens: bigint('output_tokens', { mode: 'number' }),
  audioInputMs: bigint('audio_input_ms', { mode: 'number' }),
  audioOutputMs: bigint('audio_output_ms', { mode: 'number' }),
  imageCount: integer('image_count'),
  videoMs: bigint('video_ms', { mode: 'number' }),
  quotedCostMinor: bigint('quoted_cost_minor', { mode: 'number' }),
  actualCostMinor: bigint('actual_cost_minor', { mode: 'number' }),
  costCurrency: varchar('cost_currency', { length: 3 }).notNull(),
  customerChargeMinor: bigint('customer_charge_minor', { mode: 'number' }),
  customerCurrency: varchar('customer_currency', { length: 3 }).notNull(),
  marginPercent: numeric('margin_percent', { precision: 6, scale: 3 }),
  status: text('status').notNull().default('completed'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  metadata: jsonb('metadata').notNull().default({}),
}, table => [
  index('idx_provider_usage_user').on(table.userId, table.startedAt.desc()),
  index('idx_provider_usage_provider').on(table.provider, table.startedAt.desc()),
]);

// ── Usage Reservations ──
export const usageReservations = pgTable('usage_reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  requestId: uuid('request_id').notNull(),
  idempotencyKey: text('idempotency_key').notNull(),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  feature: text('feature').notNull(),
  estimatedProviderCostMinor: bigint('estimated_provider_cost_minor', { mode: 'number' }).notNull(),
  estimatedCustomerPriceMinor: bigint('estimated_customer_price_minor', { mode: 'number' }).notNull(),
  actualProviderCostMinor: bigint('actual_provider_cost_minor', { mode: 'number' }),
  actualCustomerPriceMinor: bigint('actual_customer_price_minor', { mode: 'number' }),
  status: text('status').notNull().default('pending'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb('metadata').notNull().default({}),
}, table => [
  unique('uq_user_idempotency').on(table.userId, table.idempotencyKey),
  index('idx_reservations_status').on(table.status, table.createdAt),
]);

// ── Webhook Events (idempotency) ──
export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull(),
  externalEventId: text('external_event_id').notNull(),
  eventType: text('event_type').notNull(),
  payloadHash: text('payload_hash').notNull(),
  status: text('status').notNull().default('received'),
  attemptCount: integer('attempt_count').notNull().default(1),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  error: text('error'),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  unique('uq_webhook_provider_event').on(table.provider, table.externalEventId),
]);

// ── Daily Treasury Snapshots ──
export const treasurySnapshots = pgTable('treasury_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: text('date').notNull().unique(),
  currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
  grossRevenue: bigint('gross_revenue', { mode: 'number' }).notNull().default(0),
  netRevenue: bigint('net_revenue', { mode: 'number' }).notNull().default(0),
  providerAccrued: bigint('provider_accrued', { mode: 'number' }).notNull().default(0),
  providerSettled: bigint('provider_settled', { mode: 'number' }).notNull().default(0),
  providerPayable: bigint('provider_payable', { mode: 'number' }).notNull().default(0),
  refundsReserve: bigint('refunds_reserve', { mode: 'number' }).notNull().default(0),
  taxReserve: bigint('tax_reserve', { mode: 'number' }).notNull().default(0),
  operatingReserve: bigint('operating_reserve', { mode: 'number' }).notNull().default(0),
  safeWithdrawable: bigint('safe_withdrawable', { mode: 'number' }).notNull().default(0),
  stripeAvailable: bigint('stripe_available', { mode: 'number' }),
  activePaidUsers: integer('active_paid_users').notNull().default(0),
  grossMarginPercent: numeric('gross_margin_percent', { precision: 6, scale: 3 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb('metadata').notNull().default({}),
});

// ── Margin Policies ──
export const marginPolicies = pgTable('margin_policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  targetGrossMargin: numeric('target_gross_margin', { precision: 6, scale: 4 }).notNull().default('0.75'),
  warningMargin: numeric('warning_margin', { precision: 6, scale: 4 }).notNull().default('0.55'),
  hardMinimumMargin: numeric('hard_minimum_margin', { precision: 6, scale: 4 }).notNull().default('0.35'),
  provider: text('provider'),
  model: text('model'),
  feature: text('feature'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Billing Alerts ──
export const billingAlerts = pgTable('billing_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(),
  severity: text('severity').notNull().default('warning'),
  title: text('title').notNull(),
  message: text('message').notNull(),
  provider: text('provider'),
  acknowledged: boolean('acknowledged').notNull().default(false),
  acknowledgedBy: uuid('acknowledged_by'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb('metadata').notNull().default({}),
});

// ── Provider Invoices ──
export const providerInvoices = pgTable('provider_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull(),
  externalInvoiceId: text('external_invoice_id'),
  currency: varchar('currency', { length: 3 }).notNull(),
  subtotalMinor: bigint('subtotal_minor', { mode: 'number' }).notNull(),
  taxMinor: bigint('tax_minor', { mode: 'number' }).notNull().default(0),
  totalMinor: bigint('total_minor', { mode: 'number' }).notNull(),
  status: text('status').notNull().default('pending'),
  periodStart: timestamp('period_start', { withTimezone: true }),
  periodEnd: timestamp('period_end', { withTimezone: true }),
  issuedAt: timestamp('issued_at', { withTimezone: true }),
  dueAt: timestamp('due_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  rawReference: text('raw_reference'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb('metadata').notNull().default({}),
});
