import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ChatGateway } from './chat.gateway';
import {
  DrizzleMessageReactionsRepository,
  MESSAGE_REACTIONS_REPOSITORY,
  MessageReactionsService,
} from './message-reactions.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ConversationsController],
  providers: [
    ChatGateway,
    DrizzleMessageReactionsRepository,
    MessageReactionsService,
    { provide: MESSAGE_REACTIONS_REPOSITORY, useClass: DrizzleMessageReactionsRepository },
  ],
  exports: [ChatGateway, MessageReactionsService],
})
export class ConversationsModule {}
