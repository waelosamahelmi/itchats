import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { getConfig } from '@itchats/config';
import { GenerationsController } from './generations.controller';
import { GenerationsService, setGenerationQueues } from './generations.service';

@Module({
  controllers: [GenerationsController],
  providers: [GenerationsService],
  exports: [GenerationsService],
})
export class GenerationsModule implements OnModuleInit {
  private readonly logger = new Logger(GenerationsModule.name);

  async onModuleInit() {
    try {
      const config = getConfig();
      const connection = { url: config.REDIS_URL };

      const imageQueue = new Queue('image-generation', { connection });
      const videoQueue = new Queue('video-generation', { connection });

      setGenerationQueues(imageQueue, videoQueue);

      this.logger.log('BullMQ generation queues connected');
    } catch (err: any) {
      this.logger.warn(`BullMQ not available — generation jobs will be DB-only: ${err.message}`);
    }
  }
}
