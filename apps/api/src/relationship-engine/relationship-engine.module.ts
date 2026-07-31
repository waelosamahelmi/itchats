import { Module } from '@nestjs/common';
import { RelationshipEngineService } from './relationship-engine.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [RelationshipEngineService],
  exports: [RelationshipEngineService],
})
export class RelationshipEngineModule {}
