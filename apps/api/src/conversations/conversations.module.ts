import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ChatGateway } from './chat.gateway';
import {
  DrizzleMessageReactionsRepository,
  MESSAGE_REACTIONS_REPOSITORY,
  MessageReactionsService,
} from './message-reactions.service';

@Module({
  controllers: [ConversationsController],
  providers: [
    ChatGateway,
    MessageReactionsService,
    DrizzleMessageReactionsRepository,
    { provide: MESSAGE_REACTIONS_REPOSITORY, useExisting: DrizzleMessageReactionsRepository },
  ],
  exports: [ChatGateway],
})
export class ConversationsModule {}
