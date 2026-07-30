import { pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { messages } from './messages';
import { users } from './users';
import { characters } from './characters';

export const reactionActorTypeEnum = pgEnum('reaction_actor_type', ['user', 'character']);

export const messageReactions = pgTable('message_reactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  actorType: reactionActorTypeEnum('actor_type').notNull(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'cascade' }),
  actorCharacterId: uuid('actor_character_id').references(() => characters.id, { onDelete: 'cascade' }),
  emoji: text('emoji').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userReactionUnique: uniqueIndex('message_reactions_message_user_unique')
    .on(table.messageId, table.actorUserId),
  characterReactionUnique: uniqueIndex('message_reactions_message_character_unique')
    .on(table.messageId, table.actorCharacterId),
}));
