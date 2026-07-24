import { Controller, Post, Body, Req, Res, UseGuards, Get, Delete, Param } from '@nestjs/common';
import { AiService } from './ai.service';
import { MemoryService } from './memory.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import type { FastifyReply } from 'fastify';

@Controller('v1/ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly memoryService: MemoryService,
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
  async generateImage(@Body() body: { prompt: string; model?: string }) {
    return { message: 'Image generation (credit-gated)', prompt: body.prompt };
  }

  @Post('tts')
  @UseGuards(JwtAuthGuard)
  async tts(@Body() body: { text: string; voice?: string }) {
    return { message: 'TTS endpoint', text: body.text };
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
