import { Controller, Post, Body, Req, UseGuards, Get, Delete, Param, Inject, Header, HttpCode, Query } from '@nestjs/common';
import { AiService } from './ai.service';
import { MemoryService } from './memory.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { alibabaTTS, alibabaTextToImageWithFallback } from '@itchats/ai-core';
import { Readable } from 'node:stream';

const ttsCache = new Map<string, { audioBase64: string; format: string }>();
const TTS_SAMPLE = 'Hello! I am an AI character.';

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
  async streamChat(
    @Body() body: { characterId?: string; message: string; conversationId?: string },
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    const characterId = body.characterId ?? null;
    const conversationId = body.conversationId;

    const readable = new Readable({ read() {} });

    (async () => {
      try {
        for await (const chunk of this.aiService.streamChat(userId, characterId, body.message, conversationId)) {
          readable.push(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      } catch (err: any) {
        readable.push(`data: ${JSON.stringify({ type: 'error', message: err.message || 'Unknown error' })}\n\n`);
      }
      readable.push(null);
    })();

    return readable;
  }

  @Get('chat/history/:characterId')
  @UseGuards(JwtAuthGuard)
  async getChatHistory(@Param('characterId') characterId: string, @Req() req: any) {
    return this.aiService.getChatHistory(characterId, req.user.userId);
  }

  @Post('image')
  @UseGuards(JwtAuthGuard)
  async generateImage(
    @Body() body: { prompt: string; model?: string; size?: string },
    @Req() req: any,
  ) {
    try {
      const result = await this.aiService.generateImage(req.user.userId, body.prompt, body.model);
      return result;
    } catch (err: any) {
      return { error: err.message || 'Image generation failed' };
    }
  }

  @Post('tts')
  @UseGuards(JwtAuthGuard)
  async tts(@Body() body: { text: string; voice?: string; emotion?: string }, @Req() req: any) {
    const voice = body.voice ?? 'Cherry';
    const isPreview = body.text === TTS_SAMPLE && !body.emotion;

    if (isPreview) {
      const cacheKey = voice;
      const cached = ttsCache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const result = await this.aiService.generateVoice(req.user.userId, body.text, voice);
      if (isPreview) {
        ttsCache.set(voice, { audioBase64: result.audioUrl, format: result.format });
      }
      return { audioBase64: result.audioUrl, format: result.format, creditsUsed: result.creditsUsed };
    } catch (err: any) {
      return { error: err.message || 'TTS generation failed' };
    }
  }

  @Post('voice-preview')
  @UseGuards(JwtAuthGuard)
  async voicePreview(@Body() body: { voice: string; text?: string }) {
    const text = body.text ?? TTS_SAMPLE;
    const cacheKey = `${body.voice}:${text}`;
    const cached = ttsCache.get(cacheKey);
    if (cached) return cached;

    try {
      const audio = await alibabaTTS({ text, voice: body.voice, model: 'qwen-tts' });
      const result = { audioBase64: audio.audioBase64, format: audio.format };
      ttsCache.set(cacheKey, result);
      return result;
    } catch (err: any) {
      return { error: err.message || 'Voice preview failed' };
    }
  }

  @Get('relationship/:characterId')
  @UseGuards(JwtAuthGuard)
  async getRelationship(@Param('characterId') characterId: string, @Req() req: any) {
    return this.aiService.getRelationship(characterId, req.user.userId);
  }

  @Get('memories/:characterId')
  @UseGuards(JwtAuthGuard)
  async getMemories(@Param('characterId') characterId: string, @Req() req: any) {
    return this.aiService.getMemories(characterId, req.user.userId);
  }

  @Delete('memories/:characterId')
  @UseGuards(JwtAuthGuard)
  async clearMemories(@Param('characterId') characterId: string, @Req() req: any) {
    return this.aiService.clearMemories(characterId, req.user.userId);
  }
  @Post('image-to-image')
  @UseGuards(JwtAuthGuard)
  async imageToImage(@Body() body: { prompt: string; imageBase64: string }, @Req() req: any) {
    try {
      const result = await this.aiService.generateImageToImage(req.user.userId, body.prompt, body.imageBase64);
      return result;
    } catch (err: any) { return { error: err.message || 'ITI failed' }; }
  }

  @Post('text-to-video')
  @UseGuards(JwtAuthGuard)
  async textToVideo(@Body() body: { prompt: string }, @Req() req: any) {
    try {
      const result = await this.aiService.generateTextToVideo(req.user.userId, body.prompt);
      return result;
    } catch (err: any) { return { error: err.message || 'TTV failed' }; }
  }

  @Post('image-to-video')
  @UseGuards(JwtAuthGuard)
  async imageToVideo(@Body() body: { prompt: string; imageBase64: string }, @Req() req: any) {
    try {
      const result = await this.aiService.generateImageToVideo(req.user.userId, body.prompt, body.imageBase64);
      return result;
    } catch (err: any) { return { error: err.message || 'ITV failed' }; }
  }

  @Get('video/result/:taskId')
  @UseGuards(JwtAuthGuard)
  async getVideoResult(@Param('taskId') taskId: string) {
    try {
      return await this.aiService.getVideoResult(taskId);
    } catch (err: any) { return { error: err.message || 'Video result fetch failed' }; }
  }

  @Post('asr')
  @UseGuards(JwtAuthGuard)
  async asr(@Body() body: { audioBase64: string }, @Req() req: any) {
    try {
      const result = await this.aiService.transcribeVoice(req.user.userId, body.audioBase64);
      return result;
    } catch (err: any) { return { error: err.message || 'ASR failed' }; }
  }}
