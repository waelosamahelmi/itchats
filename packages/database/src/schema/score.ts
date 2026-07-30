import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const userScores = pgTable('user_scores', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  score: integer('score').notNull().default(0),
  characterPopularity: integer('character_popularity').notNull().default(0),
  postsEngagement: integer('posts_engagement').notNull().default(0),
  dailyActivity: integer('daily_activity').notNull().default(0),
  weeklyActivity: integer('weekly_activity').notNull().default(0),
  rank: text('rank').notNull().default('Newcomer'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
