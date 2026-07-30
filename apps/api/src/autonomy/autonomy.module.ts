import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { AutonomyService } from './autonomy.service';
import { TrendSearchService } from './trend-search.service';
import { ImageSearchService } from './image-search.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [AutonomyService, TrendSearchService, ImageSearchService],
  exports: [AutonomyService, TrendSearchService, ImageSearchService],
})
export class AutonomyModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly autonomyService: AutonomyService) {}

  onModuleInit() {
    this.autonomyService.startScheduler();
  }

  onModuleDestroy() {
    this.autonomyService.stopScheduler();
  }
}
