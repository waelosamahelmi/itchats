import { Controller, Post, Body, Req, UseGuards, Get, Delete, Param, Inject, Header, HttpCode, Query } from '@nestjs/common';
import { AiService } from './ai.service';
import { MemoryService } from './memory.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { alibabaTTS, alibabaTextToImageWithFallback } from '@itchats/ai-core';
import { RoleplayService } from '../roleplay/roleplay.service';
import { RelationshipService } from '../relationship/relationship.service';
import { CharacterCreationService } from '../characters/character-creation.service';
import { Readable } from 'node:stream';

const ttsCache = new Map<string, { audioBase64: string; format: string }>();
const TTS_SAMPLE = 'Hello! I am an AI character.';

function safeAiError(fallback: string) {
  return { error: fallback };
}

@Controller('v1/ai')
export class AiController {
  constructor(
    @Inject(AiService) private readonly aiService: AiService,
    @Inject(MemoryService) private readonly memoryService: MemoryService,
    @Inject(RoleplayService) private readonly roleplayService: RoleplayService,
    @Inject(RelationshipService) private readonly relationshipService: RelationshipService,
    @Inject(CharacterCreationService) private readonly characterCreationService: CharacterCreationService,
  ) {}

  @Post('chat/stream')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('X-Accel-Buffering', 'no')
  async streamChat(
    @Body() body: { characterId?: string; message: string; conversationId?: string; imageBase64?: string },
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    const characterId = body.characterId ?? null;
    const conversationId = body.conversationId;

    const readable = new Readable({ read() {} });

    (async () => {
      try {
        for await (const chunk of this.aiService.streamChat(userId, characterId, body.message, conversationId, body.imageBase64)) {
          readable.push(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      } catch (err: any) {
        readable.push(`data: ${JSON.stringify({ type: 'error', message: 'AI generation failed. Please try again.' })}\n\n`);
      }
      readable.push(null);
    })();

    return readable;
  }

  @Post('chat/media/approve')
  @UseGuards(JwtAuthGuard)
  async approveMedia(
    @Body() body: { characterId: string; conversationId: string; requestId: string; approved: boolean },
    @Req() req: any,
  ) {
    try {
      return await this.aiService.approveMediaRequest(
        req.user.userId,
        body.characterId,
        body.conversationId,
        body.requestId,
        body.approved,
      );
    } catch (err: any) {
      return { status: 'error', message: err.message || 'Media approval failed' };
    }
  }

  @Get('chat/media/status/:jobId')
  @UseGuards(JwtAuthGuard)
  async getMediaJobStatus(@Param('jobId') jobId: string) {
    try {
      return await this.aiService.getMediaJobStatus(jobId);
    } catch (err: any) {
      return { status: 'error', message: err.message || 'Failed to get job status' };
    }
  }

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  async chat(@Body() body: { characterId?: string; message: string; conversationId?: string; imageBase64?: string }, @Req() req: any) {
    let content = '';
    let creditsUsed = 0;
    for await (const chunk of this.aiService.streamChat(
      req.user.userId,
      body.characterId ?? null,
      body.message,
      body.conversationId,
      body.imageBase64,
    )) {
      if (chunk.type === 'chunk') content += chunk.content;
      if (chunk.type === 'done') creditsUsed = chunk.creditsUsed ?? 0;
      if (chunk.type === 'error') return safeAiError(chunk.message || 'AI generation failed. Please try again.');
    }
    return { content, creditsUsed };
  }

  @Post('selfie')
  @UseGuards(JwtAuthGuard)
  async selfie(@Body() body: { characterId: string; style?: string; context?: string }, @Req() req: any) {
    try {
      return await this.aiService.generateSelfie(req.user.userId, body.characterId, body.style || body.context);
    } catch {
      return safeAiError('Selfie generation failed. Please try again.');
    }
  }

  @Post('character-video')
  @UseGuards(JwtAuthGuard)
  async characterVideo(@Body() body: { characterId: string; style?: string }, @Req() req: any) {
    try {
      return await this.aiService.generateCharacterVideo(req.user.userId, body.characterId, body.style);
    } catch {
      return safeAiError('Character video generation failed. Generate a profile picture first, then try again.');
    }
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
    } catch {
      return safeAiError('Image generation failed. Please try again.');
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
    } catch {
      return safeAiError('TTS generation failed. Please try again.');
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
    } catch {
      return safeAiError('Voice preview failed. Please try again.');
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
    } catch { return safeAiError('Image edit failed. Please try again.'); }
  }

  @Post('text-to-video')
  @UseGuards(JwtAuthGuard)
  async textToVideo(@Body() body: { prompt: string }, @Req() req: any) {
    try {
      const result = await this.aiService.generateTextToVideo(req.user.userId, body.prompt);
      return result;
    } catch { return safeAiError('Video generation failed. Please try again.'); }
  }

  @Post('image-to-video')
  @UseGuards(JwtAuthGuard)
  async imageToVideo(@Body() body: { prompt: string; imageBase64: string }, @Req() req: any) {
    try {
      const result = await this.aiService.generateImageToVideo(req.user.userId, body.prompt, body.imageBase64);
      return result;
    } catch { return safeAiError('Video generation failed. Please try again.'); }
  }

  @Get('video/result/:taskId')
  @UseGuards(JwtAuthGuard)
  async getVideoResult(@Param('taskId') taskId: string) {
    try {
      return await this.aiService.getVideoResult(taskId);
    } catch { return safeAiError('Video result fetch failed. Please try again.'); }
  }

  @Post('asr')
  @UseGuards(JwtAuthGuard)
  async asr(@Body() body: { audioBase64: string }, @Req() req: any) {
    try {
      const result = await this.aiService.transcribeVoice(req.user.userId, body.audioBase64);
      return result;
    } catch { return safeAiError('Transcription failed. Please try again.'); }
  }

  // ── New endpoints ──

  @Post('character/:characterId/generate-avatar')
  @UseGuards(JwtAuthGuard)
  async generateCharacterAvatar(@Param('characterId') characterId: string, @Req() req: any) {
    try {
      return await this.characterCreationService.generateProfilePicture(characterId);
    } catch {
      return safeAiError('Avatar generation failed. Please try again.');
    }
  }

  @Get('character/:characterId/relationship')
  @UseGuards(JwtAuthGuard)
  async getCharacterRelationship(@Param('characterId') characterId: string, @Req() req: any) {
    return this.relationshipService.getRelationship(characterId, req.user.userId);
  }

  @Post('character/:characterId/roleplay/request')
  @UseGuards(JwtAuthGuard)
  async requestRoleplay(@Param('characterId') characterId: string, @Req() req: any) {
    return this.roleplayService.requestRoleplay(characterId, req.user.userId);
  }

  @Get('character/:characterId/roleplay/status')
  @UseGuards(JwtAuthGuard)
  async getRoleplayStatus(@Param('characterId') characterId: string, @Req() req: any) {
    return this.roleplayService.getStatus(characterId, req.user.userId);
  }
}
