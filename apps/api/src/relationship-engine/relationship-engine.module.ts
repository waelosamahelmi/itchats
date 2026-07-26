import { Module } from '@nestjs/common';
import { RelationshipEngineService } from './relationship-engine.service';

@Module({
  providers: [RelationshipEngineService],
  exports: [RelationshipEngineService],
})
export class RelationshipEngineModule {}
