import { Injectable } from '@nestjs/common';
import { alibabaChat, alibabaChatStream, alibabaTextToImage, alibabaTTS } from '@itchats/ai-core';

@Injectable()
export class AiService {
  async chat(messages: { role: string; content: string }[], options?: { characterId?: string }) {
    return alibabaChat({
      messages: messages as { role: 'system' | 'user' | 'assistant'; content: string }[],
      temperature: 0.8,
      maxTokens: 500,
    });
  }

  async *streamChat(messages: { role: string; content: string }[]) {
    yield* alibabaChatStream({
      messages: messages as { role: 'system' | 'user' | 'assistant'; content: string }[],
    });
  }

  async generateImage(prompt: string, model?: string) {
    return alibabaTextToImage({ prompt, model });
  }

  async textToSpeech(text: string, voice?: string) {
    return alibabaTTS({ text, voice });
  }
}
