import 'dotenv/config';
import { getConfig } from '@itchats/config';
import { Worker } from 'bullmq';
import {
  videoQueue, imageQueue, memoryQueue, storyQueue,
  moderationQueue, mediaQueue, notificationQueue,
  cleanupQueue, costReconciliationQueue,
  characterAutonomyQueue, aiPostReactionsQueue,
  QUEUES, getAllQueues,
} from './queues';
import { videoGenerationProcessor } from './processors/video-processor';
import { imageGenerationProcessor } from './processors/image-processor';
import { memoryExtractionProcessor } from './processors/memory-processor';
import { mediaProcessingProcessor } from './processors/media-processor';
import { notificationProcessor } from './processors/notification-processor';
import { cleanupProcessor } from './processors/cleanup-processor';
import { characterAutonomyProcessor, aiPostReactionsProcessor } from './processors/autonomy.processor';

const config = getConfig();
const connection = { url: config.REDIS_URL };

function createWorker(
  name: string,
  processor: (job: any) => Promise<any>,
  concurrency = 3,
) {
  const worker = new Worker(name, processor, {
    connection,
    concurrency,
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 7 * 86400 },
    lockDuration: 120_000,
    stalledInterval: 30_000,
    maxStalledCount: 2,
  });

  worker.on('completed', (job) => {
    console.log(`[${name}] ✅ Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[${name}] ❌ Job ${job?.id ?? '?'} failed:`, err.message.slice(0, 200));
  });

  worker.on('error', (err) => {
    console.error(`[${name}] Worker error:`, err.message);
  });

  return worker;
}

async function main() {
  console.log('🚀 ItChats Worker starting...');
  console.log(`   Environment: ${config.NODE_ENV}`);
  console.log(`   Redis: ${config.REDIS_URL}`);

  const videoWorker = createWorker(QUEUES.VIDEO_GENERATION, videoGenerationProcessor, 2);
  const imageWorker = createWorker(QUEUES.IMAGE_GENERATION, imageGenerationProcessor, 3);
  const memoryWorker = createWorker(QUEUES.MEMORY_EXTRACTION, memoryExtractionProcessor, 5);
  const mediaWorker = createWorker(QUEUES.MEDIA_PROCESSING, mediaProcessingProcessor, 2);
  const notificationWorker = createWorker(QUEUES.NOTIFICATIONS, notificationProcessor, 10);
  const cleanupWorker = createWorker(QUEUES.CLEANUP, cleanupProcessor, 1);
  const autonomyWorker = createWorker(QUEUES.CHARACTER_AUTONOMY, characterAutonomyProcessor, 1);
  const aiReactionsWorker = createWorker(QUEUES.AI_POST_REACTIONS, aiPostReactionsProcessor, 3);

  const workers = [videoWorker, imageWorker, memoryWorker, mediaWorker, notificationWorker, cleanupWorker, autonomyWorker, aiReactionsWorker];

  // Scheduled cleanup jobs
  await cleanupQueue.add('daily-cleanup', { task: 'expired_stories' } as any, {
    repeat: { pattern: '0 3 * * *' },
  });
  await cleanupQueue.add('daily-token-cleanup', { task: 'expired_tokens' } as any, {
    repeat: { pattern: '0 4 * * *' },
  });
  await cleanupQueue.add('weekly-orphan-cleanup', { task: 'orphaned_media' } as any, {
    repeat: { pattern: '0 5 * * 0' },
  });

  // Scheduled autonomy check every 15 minutes
  await characterAutonomyQueue.add('autonomy-check', { processAll: true } as any, {
    repeat: { every: 15 * 60 * 1000 },
  });

  console.log(`✅ ${workers.length} workers initialized`);
  console.log('   Queues:', getAllQueues().map(q => q.name).join(', '));

  const shutdown = async () => {
    console.log('\n🛑 Shutting down workers...');
    await Promise.all(workers.map(w => w.close()));
    console.log('✅ All workers stopped');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
