import { Module, OnModuleInit, forwardRef, Inject, Optional } from '@nestjs/common';
import { StoriesController } from './stories.controller';
import { StorySchedulerService } from './story-scheduler.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [forwardRef(() => BillingModule)],
  controllers: [StoriesController],
  providers: [StorySchedulerService],
})
export class StoriesModule implements OnModuleInit {
  constructor(@Optional() private readonly scheduler?: StorySchedulerService) {}
  onModuleInit() { this.scheduler?.start(); }
}
