import {
  Controller,
  Get,
  Param,
  UseGuards,
  Inject,
  NotFoundException,
  Res,
  Header,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { VoicesService } from './voices.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('v1/voices')
export class VoicesController {
  constructor(
    @Inject(VoicesService) private readonly voicesService: VoicesService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async listVoices() {
    return this.voicesService.getVoices();
  }

  @Get(':id/preview')
  @UseGuards(JwtAuthGuard)
  async previewVoice(@Param('id') id: string) {
    const preview = await this.voicesService.getVoicePreview(id).catch(() => {
      throw new NotFoundException('Voice not found or no preview available');
    });
    return preview;
  }
}
