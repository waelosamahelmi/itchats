import { Injectable } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { preGeneratedVoices } from '@itchats/database/schema';
import { eq, sql } from 'drizzle-orm';

export interface VoiceDefinition {
  voiceKey: string;
  label: string;
  gender: string;
  style: string;
  description: string;
}

@Injectable()
export class VoicesService {
  async getVoices() {
    const db = getDb();
    return db
      .select({
        id: preGeneratedVoices.id,
        voiceKey: preGeneratedVoices.voiceKey,
        label: preGeneratedVoices.label,
        gender: preGeneratedVoices.gender,
        style: preGeneratedVoices.style,
        description: preGeneratedVoices.description,
        audioUrl: preGeneratedVoices.audioUrl,
        sampleText: preGeneratedVoices.sampleText,
        duration: preGeneratedVoices.duration,
      })
      .from(preGeneratedVoices)
      .where(eq(preGeneratedVoices.isActive, true))
      .orderBy(sql`${preGeneratedVoices.gender}, ${preGeneratedVoices.label}`);
  }

  async getVoicePreview(voiceId: string) {
    const db = getDb();
    const [voice] = await db
      .select()
      .from(preGeneratedVoices)
      .where(eq(preGeneratedVoices.id, voiceId))
      .limit(1);
    if (!voice) throw new Error('Voice not found');
    if (!voice.audioUrl) throw new Error('No preview audio available for this voice');

    return { id: voice.id, voiceKey: voice.voiceKey, audioUrl: voice.audioUrl, format: 'mp3' };
  }

  /**
   * Populates the pre_generated_voices table with voice definitions from TTS_VOICES in alibaba.ts.
   * Audio samples are generated separately via VoiceGeneratorService.seedOnStartup().
   * Intended to be called once during setup.
   */
  async seedVoices(voiceDefinitions: VoiceDefinition[]) {
    const db = getDb();

    for (const v of voiceDefinitions) {
      await db
        .insert(preGeneratedVoices)
        .values({
          voiceKey: v.voiceKey,
          label: v.label,
          gender: v.gender as any,
          style: v.style,
          description: v.description,
        })
        .onConflictDoUpdate({
          target: preGeneratedVoices.voiceKey,
          set: {
            label: v.label,
            gender: v.gender as any,
            style: v.style,
            description: v.description,
          },
        });
    }

    return { seeded: voiceDefinitions.length };
  }
}
