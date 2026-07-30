import { Queue } from 'bullmq';
import { getConfig } from '@itchats/config';

const config = getConfig();
const connection = { url: config.REDIS_URL };

// ── Queue names ──
export const QUEUES = {
  VIDEO_GENERATION: 'video-generation',
  IMAGE_GENERATION: 'image-generation',
  MEMORY_EXTRACTION: 'memory-extraction',
  STORY_GENERATION: 'story-generation',
  MODERATION: 'moderation',
  MEDIA_PROCESSING: 'media-processing',
  NOTIFICATIONS: 'notifications',
  CLEANUP: 'cleanup',
  COST_RECONCILIATION: 'cost-reconciliation',
} as const;

// ── Queue instances ──
export const videoQueue = new Queue(QUEUES.VIDEO_GENERATION, { connection });
export const imageQueue = new Queue(QUEUES.IMAGE_GENERATION, { connection });
export const memoryQueue = new Queue(QUEUES.MEMORY_EXTRACTION, { connection });
export const storyQueue = new Queue(QUEUES.STORY_GENERATION, { connection });
export const moderationQueue = new Queue(QUEUES.MODERATION, { connection });
export const mediaQueue = new Queue(QUEUES.MEDIA_PROCESSING, { connection });
export const notificationQueue = new Queue(QUEUES.NOTIFICATIONS, { connection });
export const cleanupQueue = new Queue(QUEUES.CLEANUP, { connection });
export const costReconciliationQueue = new Queue(QUEUES.COST_RECONCILIATION, { connection });

// ── Job type definitions ──
export interface VideoGenerationJob {
  jobId: string;
  generationType: 'text_to_video' | 'image_to_video' | 'reference_to_video';
  prompt: string;
  imageBase64?: string;
  model?: string;
  userId: string;
  characterId?: string;
}

export interface ImageGenerationJob {
  jobId: string;
  generationType: 'text_to_image' | 'image_to_image';
  prompt: string;
  imageUrl?: string;
  model?: string;
  userId: string;
  characterId?: string;
}

export interface MemoryExtractionJob {
  characterId: string;
  userId: string;
  conversationId: string;
  userMessage: string;
  aiResponse: string;
}

export interface StoryGenerationJob {
  characterId: string;
  userId: string;
  storyType: 'text' | 'image' | 'video' | 'voice';
}

export interface MediaProcessingJob {
  mediaAssetId: string;
  operations: Array<'thumbnail' | 'transcode' | 'strip_exif' | 'optimize'>;
}

export interface NotificationJob {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface CleanupJob {
  task: 'expired_stories' | 'expired_tokens' | 'orphaned_media' | 'old_sessions';
}

export interface CostReconciliationJob {
  provider: string;
  date: string;
}

/** Get all queues for health checks */
export function getAllQueues(): Queue[] {
  return [
    videoQueue, imageQueue, memoryQueue, storyQueue,
    moderationQueue, mediaQueue, notificationQueue,
    cleanupQueue, costReconciliationQueue,
  ];
}
