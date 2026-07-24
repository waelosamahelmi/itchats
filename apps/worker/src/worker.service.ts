import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { getConfig } from '@itchats/config';

@Injectable()
export class WorkerService implements OnModuleInit {
  private readonly logger = new Logger(WorkerService.name);

  async onModuleInit() {
    const config = getConfig();
    this.logger.log('🚀 Worker service initialized');
    this.logger.log(`Database: ${config.DATABASE_URL?.split('@')[1] ?? 'connected'}`);
    this.logger.log(`Redis: ${config.REDIS_URL}`);

    // Queue initialization will be added as needed:
    // TODO: Initialize BullMQ queues for:
    // - AI generation jobs
    // - Story scheduling
    // - Memory extraction
    // - Media processing (thumbnails, transcoding)
    // - Push notifications
    // - Content moderation
    // - Usage/cost reconciliation
    // - Cleanup tasks (expired stories, old tokens)
  }
}
