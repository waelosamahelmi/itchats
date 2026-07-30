import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { AutonomyService } from './autonomy.service';

@Module({
  providers: [AutonomyService],
  exports: [AutonomyService],
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
