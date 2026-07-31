import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { MemoryService } from './memory.service';
import { ContextBuilderService } from './context-builder.service';
import { AiReactionsService } from './ai-reactions.service';
import { RelationshipEngineModule } from '../relationship-engine/relationship-engine.module';
import { DailyLifeModule } from '../daily-life/daily-life.module';
import { IdentityConsistencyModule } from '../identity-consistency/identity-consistency.module';
import { ReferencePackModule } from '../reference-pack/reference-pack.module';
import { RelationshipModule } from '../relationship/relationship.module';
import { RoleplayModule } from '../roleplay/roleplay.module';
import { CharactersModule } from '../characters/characters.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    RelationshipEngineModule,
    DailyLifeModule,
    IdentityConsistencyModule,
    ReferencePackModule,
    RelationshipModule,
    RoleplayModule,
    CharactersModule,
  ],
  controllers: [AiController],
  providers: [AiService, MemoryService, ContextBuilderService, AiReactionsService],
  exports: [AiService, MemoryService, AiReactionsService],
})
export class AiModule {}
