import { Injectable, Logger } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { preGeneratedVoices } from '@itchats/database/schema';
import { eq, sql } from 'drizzle-orm';
import { alibabaTTSLegacy, TTS_VOICES } from '@itchats/ai-core';
import type { VoiceDefinition } from './voices.service';

@Injectable()
export class VoiceGeneratorService {
  private readonly logger = new Logger(VoiceGeneratorService.name);

  /**
   * Generate pre-recorded sample audio for every defined TTS voice
   * and store as base64 data URL in the pre_generated_voices table.
   */
  async generateAllVoiceSamples(): Promise<{ generated: number; skipped: number; errors: number }> {
    const db = getDb();
    const voiceKeys = Object.keys(TTS_VOICES);
    let generated = 0;
    let skipped = 0;
    let errors = 0;

    for (const voiceKey of voiceKeys) {
      try {
        // Check if this voice already has a sample
        const [existing] = await db
          .select({ audioUrl: preGeneratedVoices.audioUrl })
          .from(preGeneratedVoices)
          .where(eq(preGeneratedVoices.voiceKey, voiceKey))
          .limit(1);

        if (existing?.audioUrl) {
          skipped++;
          this.logger.log(`Voice sample already exists for ${voiceKey}, skipping`);
          continue;
        }

        await this.generateVoiceSample(voiceKey);
        generated++;
        this.logger.log(`Generated voice sample for ${voiceKey}`);
      } catch (err: any) {
        errors++;
        this.logger.error(`Failed to generate voice sample for ${voiceKey}: ${err.message}`);
      }
    }

    this.logger.log(
      `Voice generation complete: ${generated} generated, ${skipped} skipped, ${errors} errors`,
    );
    return { generated, skipped, errors };
  }

  /**
   * Generate a sample audio for a single voice and store it in the database.
   */
  async generateVoiceSample(voiceKey: string): Promise<void> {
    const db = getDb();
    const voice = TTS_VOICES[voiceKey];
    if (!voice) {
      throw new Error(`Unknown voice key: ${voiceKey}`);
    }

    const sampleText = `Hello, this is ${voice.label}. I'm a ${voice.style} ${voice.gender} voice.`;

    this.logger.log(`Generating TTS sample for ${voiceKey} (${voice.label})...`);

    const result = await alibabaTTSLegacy({
      text: sampleText,
      voice: voiceKey,
    });

    const dataUrl = `data:audio/${result.format};base64,${result.audioBase64}`;

    await db
      .update(preGeneratedVoices)
      .set({
        audioUrl: dataUrl,
        sampleText,
        duration: 0, // Duration not easily available from TTS response
      })
      .where(eq(preGeneratedVoices.voiceKey, voiceKey));

    this.logger.log(`Stored sample audio for ${voiceKey} (${dataUrl.length} chars data URL)`);
  }

  /**
   * Seed voice definitions from TTS_VOICES into pre_generated_voices table,
   * then generate sample audio if missing.
   * Called on app startup.
   */
  async seedOnStartup(): Promise<void> {
    const db = getDb();

    // Check if table already has voices seeded
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(preGeneratedVoices)
      .limit(1);

    const count = Number(row?.count ?? 0);

    if (count === 0) {
      this.logger.log('Seeding voice definitions from TTS_VOICES...');
      const definitions: VoiceDefinition[] = Object.entries(TTS_VOICES).map(([key, v]) => ({
        voiceKey: key,
        label: v.label,
        gender: v.gender,
        style: v.style,
        description: v.desc,
      }));

      for (const def of definitions) {
        await db
          .insert(preGeneratedVoices)
          .values({
            voiceKey: def.voiceKey,
            label: def.label,
            gender: def.gender as any,
            style: def.style,
            description: def.description,
          })
          .onConflictDoUpdate({
            target: preGeneratedVoices.voiceKey,
            set: {
              label: def.label,
              gender: def.gender as any,
              style: def.style,
              description: def.description,
            },
          });
      }

      this.logger.log(`Seeded ${definitions.length} voice definitions`);
    }

    // Generate sample audio in background (non-blocking)
    this.generateAllVoiceSamples().catch((err) => {
      this.logger.error(`Background voice sample generation failed: ${err.message}`);
    });
  }
}
