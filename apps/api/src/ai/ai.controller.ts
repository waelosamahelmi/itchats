import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('v1/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(@Body() body: { messages: { role: string; content: string }[]; characterId?: string }) {
    return this.aiService.chat(body.messages, { characterId: body.characterId });
  }

  @Post('image')
  async generateImage(@Body() body: { prompt: string; model?: string }) {
    return this.aiService.generateImage(body.prompt, body.model);
  }

  @Post('tts')
  async tts(@Body() body: { text: string; voice?: string }) {
    return this.aiService.textToSpeech(body.text, body.voice);
  }
}
