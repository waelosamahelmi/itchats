import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ChatGateway } from './chat.gateway';

@Module({
  controllers: [ConversationsController],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ConversationsModule {}
