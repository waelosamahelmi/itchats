import { Injectable, Logger } from '@nestjs/common';
import { getConfig } from '@itchats/config';

export interface ModerationResult {
  passed: boolean;
  flagged: boolean;
  categories: string[];
  confidence: number;
  reason?: string;
}

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);
  private readonly blockedPatterns = [
    /\b(hate speech|violence|terrorism|explicit content)\b/i,
  ];

  /**
   * Screen text content for policy violations.
   * Falls back to local regex matching when AI moderation is unavailable.
   */
  async moderateText(text: string): Promise<ModerationResult> {
    const config = getConfig();

    // Local pattern matching (always runs)
    for (const pattern of this.blockedPatterns) {
      if (pattern.test(text)) {
        return { passed: false, flagged: true, categories: ['blocked_content'], confidence: 1.0, reason: 'Matched blocked pattern' };
      }
    }

    // Try AI-based moderation via Alibaba
    if (config.ALIBABA_API_KEY && config.ALIBABA_API_KEY !== 'your-alibaba-api-key-here') {
      try {
        const res = await fetch(`${config.ALIBABA_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.ALIBABA_API_KEY}` },
          body: JSON.stringify({
            model: 'qwen3.5-flash',
            messages: [
              { role: 'system', content: 'You are a content moderator. Classify the following text. Respond with JSON: {"safe":true,"categories":[],"confidence":0.9}. Categories: hate, violence, adult, spam, harassment, self_harm.' },
              { role: 'user', content: text.slice(0, 1000) },
            ],
            temperature: 0,
            max_tokens: 100,
          }),
        });
        const data = await res.json() as any;
        const content = data?.choices?.[0]?.message?.content ?? '';
        const parsed = this.safeParseJson(content);
        if (parsed && !parsed.safe) {
          return { passed: false, flagged: true, categories: parsed.categories ?? ['flagged'], confidence: parsed.confidence ?? 0.8, reason: 'AI moderation flagged content' };
        }
      } catch (err) {
        this.logger.warn(`AI moderation unavailable: ${err}`);
      }
    }

    return { passed: true, flagged: false, categories: [], confidence: 1.0 };
  }

  /** Screen images by URL or description */
  async moderateImage(description: string): Promise<ModerationResult> {
    return this.moderateText(description);
  }

  /** Public identity validation per plan §2.3 */
  validatePublicIdentity(visibility: string, identityOrigin: string): { valid: boolean; reason?: string } {
    if (visibility !== 'public') return { valid: true };
    const publicSafeOrigins = ['text_generated', 'public_regenerated_from_private_metadata'];
    if (!publicSafeOrigins.includes(identityOrigin)) {
      return { valid: false, reason: 'Public characters must use AI-generated visual identities, not uploaded references' };
    }
    return { valid: true };
  }

  private safeParseJson(text: string): any {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : null;
    } catch { return null; }
  }
}
