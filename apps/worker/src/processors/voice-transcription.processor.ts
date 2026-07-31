import { Job } from 'bullmq';
import { getDb } from '@itchats/database';
import { mediaAssets, messages } from '@itchats/database/schema';
import { eq } from 'drizzle-orm';
import { alibabaASR } from '@itchats/ai-core';
import { readFileSync, existsSync } from 'node:fs';
import type { VoiceTranscriptionJob } from '../queues';

/**
 * Voice Transcription Processor
 *
 * Transcribes uploaded voice notes:
 * 1. Reads the audio file
 * 2. Sends to ASR
 * 3. Stores transcription on media asset
 * 4. Triggers AI reply by saving transcription as user message
 */
export async function voiceTranscriptionProcessor(job: Job<VoiceTranscriptionJob>) {
  const db = getDb();
  const { mediaAssetId, userId, conversationId, characterId, localFilePath } = job.data;

  // ── 1. Get media asset ──
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, mediaAssetId))
    .limit(1);
  if (!asset) {
    return { skipped: true, reason: 'media asset not found' };
  }

  // ── 2. Get audio data ──
  let audioBase64: string;

  if (localFilePath && existsSync(localFilePath)) {
    const buffer = readFileSync(localFilePath);
    audioBase64 = buffer.toString('base64');
  } else {
    // Try to get from object storage or local uploads
    const meta = (asset.metadata as any) ?? {};
    if (meta.localPath && existsSync(meta.localPath)) {
      const buffer = readFileSync(meta.localPath);
      audioBase64 = buffer.toString('base64');
    } else {
      return { skipped: true, reason: 'audio file not accessible' };
    }
  }

  if (!audioBase64 || audioBase64.length < 100) {
    return { skipped: true, reason: 'audio data too small' };
  }

  // ── 3. Transcribe ──
  try {
    const result = await alibabaASR({ audioBase64 });
    const transcription = result?.text || '';

    // ── 4. Store transcription on media asset metadata ──
    const meta = (asset.metadata as any) ?? {};
    await db
      .update(mediaAssets)
      .set({
        metadata: { ...meta, transcription, transcribedAt: new Date().toISOString() },
      } as any)
      .where(eq(mediaAssets.id, mediaAssetId));

    if (!transcription.trim()) {
      return { skipped: true, reason: 'empty transcription' };
    }

    // ── 5. Save transcribed text as a user message (triggers AI response) ──
    // The voice_note message should already be persisted by the controller.
    // We save the transcription text as a separate text message OR update the voice note.
    // For simplicity, we'll save the transcription as a new text message that references the voice note.

    await db.insert(messages).values({
      conversationId,
      senderType: 'user',
      senderUserId: userId,
      type: 'text',
      content: `[Voice Message]: ${transcription}`,
      replyToId: mediaAssetId, // Reference the voice note
    } as any);

    console.log(`[voice-transcription] Transcribed voice note ${mediaAssetId}: "${transcription.slice(0, 80)}"`);
    return { transcribed: true, transcription: transcription.slice(0, 500), mediaAssetId };
  } catch (err: any) {
    console.error(`[voice-transcription] ASR failed: ${err.message}`);
    return { skipped: true, reason: `ASR error: ${err.message.slice(0, 100)}` };
  }
}
