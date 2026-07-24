import { Controller, Post, Body, Req, Res, UseGuards, Get, Delete, Param, Inject } from '@nestjs/common';
import { AiService } from './ai.service';
import { MemoryService } from './memory.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { alibabaTTSWithFallback, alibabaTextToImageWithFallback } from '@itchats/ai-core';
import type { FastifyReply } from 'fastify';

@Controller('v1/ai')
export class AiController {
  constructor(
    @Inject(AiService) private readonly aiService: AiService,
    @Inject(MemoryService) private readonly memoryService: MemoryService,
  ) {}

  @Post('chat/stream')
  @UseGuards(JwtAuthGuard)
  async streamChat(@Body() body: { characterId?: string; message: string; conversationId?: string }, @Req() req: any, @Res() res: FastifyReply) {
    res.header('Content-Type', 'text/event-stream');
    res.header('Cache-Control', 'no-cache');
    res.header('Connection', 'keep-alive');
    res.raw.writeHead(200);
    try {
      for await (const chunk of this.aiService.streamChat(req.user.userId, body.characterId ?? null, body.message, body.conversationId)) {
        res.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    } catch (err: any) {
      res.raw.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    }
    res.raw.end();
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
      return { error: err.message };
    }
  }

  @Post('tts')
  @UseGuards(JwtAuthGuard)
  async tts(@Body() body: { text: string; voice?: string; emotion?: string }) {
    try {
      const audio = await alibabaTTSWithFallback({
        text: body.text,
        voice: body.voice ?? 'Cherry',
        emotion: body.emotion as any,
      });
      return { audioBase64: audio.audioBase64, format: audio.format, model: audio.usedModel };
    } catch (err: any) {
      return { error: err.message };
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
