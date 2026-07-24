import { pgTable, uuid, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';

export const aiProviders = pgTable('ai_providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  enabled: text('enabled').notNull().default('true'),
  configKey: text('config_key').notNull(),
  baseUrlKey: text('base_url_key'),
  region: text('region'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const aiModels = pgTable('ai_models', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerId: text('provider_id').notNull().references(() => aiProviders.id),
  modelKey: text('model_key').notNull(),
  displayName: text('display_name').notNull(),
  capability: text('capability').notNull(),
  deploymentScope: text('deployment_scope'),
  region: text('region'),
  enabled: text('enabled').notNull().default('true'),
  priority: integer('priority').notNull().default(100),
  pricingRule: jsonb('pricing_rule').notNull(),
  limits: jsonb('limits').notNull().default('{}'),
  metadata: jsonb('metadata').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const modelRoutes = pgTable('model_routes', {
  id: uuid('id').primaryKey().defaultRandom(),
  routeKey: text('route_key').notNull(),
  modelId: uuid('model_id').notNull().references(() => aiModels.id),
  priority: integer('priority').notNull().default(100),
  enabled: text('enabled').notNull().default('true'),
  minPlanId: text('min_plan_id'),
  conditions: jsonb('conditions').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const promptTemplates = pgTable('prompt_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull(),
  version: integer('version').notNull(),
  content: text('content').notNull(),
  schemaJson: jsonb('schema_json'),
  enabled: text('enabled').notNull().default('true'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const providerIncidents = pgTable('provider_incidents', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerId: text('provider_id').references(() => aiProviders.id),
  modelId: uuid('model_id').references(() => aiModels.id),
  incidentType: text('incident_type').notNull(),
  status: text('status').notNull(),
  detail: jsonb('detail').notNull().default('{}'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
