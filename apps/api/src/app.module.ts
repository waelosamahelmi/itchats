import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CharactersModule } from './characters/characters.module';
import { ConversationsModule } from './conversations/conversations.module';
import { AiModule } from './ai/ai.module';
import { GenerationsModule } from './generations/generations.module';
import { MediaModule } from './media/media.module';
import { StoriesModule } from './stories/stories.module';
import { SocialModule } from './social/social.module';
import { BillingModule } from './billing/billing.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    HealthModule,
    AuthModule,
    UsersModule,
    CharactersModule,
    ConversationsModule,
    AiModule,
    GenerationsModule,
    MediaModule,
    StoriesModule,
    SocialModule,
    BillingModule,
  ],
})
export class AppModule {}
