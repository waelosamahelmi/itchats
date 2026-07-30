import {
  pgTable,
  uuid,
  timestamp,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const friendStatusEnum = pgEnum('friend_status', ['pending', 'accepted', 'blocked']);

export const userFriends = pgTable('user_friends', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  friendId: uuid('friend_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: friendStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userFriendUnique: uniqueIndex('user_friends_user_friend_unique').on(table.userId, table.friendId),
}));
