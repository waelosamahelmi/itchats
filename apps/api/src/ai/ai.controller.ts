import { Controller, Post, Body, Req, UseGuards, Get, Delete, Param, Inject, Header, HttpCode } from '@nestjs/common';
import { AiService } from './ai.service';
import { MemoryService } from './memory.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { alibabaTTS, alibabaTextToImageWithFallback } from '@itchats/ai-core';
import { Readable } from 'node:stream';

/** In-memory cache for voice previews — generated once, served instantly */
const ttsCache = new Map<string, { audioBase64: string; format: string }>();
const TTS_SAMPLE = 'Hello! I am an AI character.';
const CACHED_VOICES = ['longanlingxi', 'longxiaochun', 'longxiaoxia', 'longxiaobai', 'longyuer', 'longshu', 'longshao', 'longcheng'];

@Controller('v1/ai')
export class AiController {
  constructor(
    @Inject(AiService) private readonly aiService: AiService,
    @Inject(MemoryService) private readonly memoryService: MemoryService,
  ) {}

  @Post('chat/stream')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('X-Accel-Buffering', 'no')
  async streamChat(@Body() body: { characterId?: string; message: string; conversationId?: string }, @Req() req: any) {
    const userId = req.user.userId;
    const characterId = body.characterId ?? null;
    const conversationId = body.conversationId;
    const message = body.message;

    const readable = new Readable({ read() {} });

    // Consume the async generator and push SSE chunks into the Readable
    (async () => {
      try {
        for await (const chunk of this.aiService.streamChat(userId, characterId, message, conversationId)) {
          readable.push(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      } catch (err: any) {
        readable.push(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      }
      readable.push(null); // end stream
    })();

    return readable;
  }

  @Post('image')
  @UseGuards(JwtAuthGuard)
  async generateImage(@Body() body: { prompt: string; model?: string; size?: string }) {
    try {
      const result = await alibabaTextToImageWithFallback({
        prompt: body.prompt,
        model: body.model,
        size: body.size ?? '1024x1024',
      });
      return { url: result.url, model: result.usedModel };
    } catch (err: any) {
      console.error('TTS error full:', err.message);
      return { error: err.message, message: err.message };
    }
  }

  @Post('tts')
  @UseGuards(JwtAuthGuard)
  async tts(@Body() body: { text: string; voice?: string; emotion?: string }) {
    const voice = body.voice ?? 'Cherry';
    const isSample = body.text === TTS_SAMPLE && !body.emotion;

    // Serve from cache if this is a standard voice preview
    if (isSample) {
      const cacheKey = voice;
      const cached = ttsCache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const audio = await alibabaTTS({
        text: body.text,
        voice,
        model: 'qwen-tts',
      });

      console.log('TTS result:', { format: audio.format, size: audio.audioBase64.length });

      // Cache standard voice samples for instant replay
      if (isSample) {
        ttsCache.set(voice, { audioBase64: audio.audioBase64, format: audio.format });
      }

      return { audioBase64: audio.audioBase64, format: audio.format };
    } catch (err: any) {
      console.error('TTS error full:', err.message);
      return { error: err.message, message: err.message };
    }
  }

  @Get('memories/:characterId')
  @UseGuards(JwtAuthGuard)
  async getMemories(@Param('characterId') characterId: string, @Req() req: any) {
    return this.memoryService.getUserMemories(characterId, req.user.userId);
  }

  @Delete('memories/:characterId')
  @UseGuards(JwtAuthGuard)
  async clearMemories(@Param('characterId') characterId: string, @Req() req: any) {
    return this.memoryService.clearMemories(characterId, req.user.userId);
  }
}
