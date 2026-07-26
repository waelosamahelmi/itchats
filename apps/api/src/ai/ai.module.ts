import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { MemoryService } from './memory.service';
import { ContextBuilderService } from './context-builder.service';
import { RelationshipEngineModule } from '../relationship-engine/relationship-engine.module';
import { DailyLifeModule } from '../daily-life/daily-life.module';
import { IdentityConsistencyModule } from '../identity-consistency/identity-consistency.module';
import { ReferencePackModule } from '../reference-pack/reference-pack.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    RelationshipEngineModule,
    DailyLifeModule,
    IdentityConsistencyModule,
    ReferencePackModule,
  ],
  controllers: [AiController],
  providers: [AiService, MemoryService, ContextBuilderService],
  exports: [AiService, MemoryService],
})
export class AiModule {}
