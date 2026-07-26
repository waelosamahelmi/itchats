import { Module, OnModuleInit, forwardRef, Inject, Optional } from '@nestjs/common';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { StorySchedulerService } from './story-scheduler.service';
import { BillingModule } from '../billing/billing.module';
import { DailyLifeModule } from '../daily-life/daily-life.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => BillingModule), DailyLifeModule, AuthModule],
  controllers: [StoriesController],
  providers: [StoriesService, StorySchedulerService],
  exports: [StoriesService],
})
export class StoriesModule implements OnModuleInit {
  constructor(@Optional() @Inject(StorySchedulerService) private readonly scheduler?: StorySchedulerService) {}
  onModuleInit() { this.scheduler?.start(); }
}
