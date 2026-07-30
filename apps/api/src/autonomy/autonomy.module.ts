import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { AutonomyService } from './autonomy.service';
import { TrendSearchService } from './trend-search.service';

@Module({
  providers: [AutonomyService, TrendSearchService],
  exports: [AutonomyService, TrendSearchService],
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
