import { Controller, Get, Post, Delete, Param, Body, Req, UseGuards, Inject, NotFoundException } from '@nestjs/common';
import { GenerationsService } from './generations.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('v1/generations')
export class GenerationsController {
  constructor(
    @Inject(GenerationsService) private readonly generationsService: GenerationsService,
  ) {}

  @Post('images')
  @UseGuards(JwtAuthGuard)
  async createImage(@Body() body: { prompt: string; model?: string }, @Req() req: any) {
    return this.generationsService.requestImage(req.user.userId ?? req.user.id, body.prompt, body.model);
  }

  @Post('image-edits')
  @UseGuards(JwtAuthGuard)
  async createImageEdit(@Body() body: { prompt: string; imageUrl: string; model?: string }, @Req() req: any) {
    return this.generationsService.requestImageEdit(req.user.userId ?? req.user.id, body.prompt, body.imageUrl);
  }

  @Post('videos')
  @UseGuards(JwtAuthGuard)
  async createVideo(@Body() body: { prompt: string }, @Req() req: any) {
    return this.generationsService.requestVideo(req.user.userId ?? req.user.id, body.prompt);
  }

  @Post('tts')
  @UseGuards(JwtAuthGuard)
  async createTTS(@Body() body: { text: string; voice?: string }, @Req() req: any) {
    return this.generationsService.requestTTS(req.user.userId ?? req.user.id, body.text, body.voice);
  }

  @Post('asr')
  @UseGuards(JwtAuthGuard)
  async createASR(@Body() body: { audioUrl: string }, @Req() req: any) {
    return this.generationsService.requestASR(req.user.userId ?? req.user.id, body.audioUrl);
  }

  @Get('jobs')
  @UseGuards(JwtAuthGuard)
  async listJobs(@Req() req: any) {
    return this.generationsService.listJobs(req.user.userId ?? req.user.id);
  }

  @Get(':jobId')
  @UseGuards(JwtAuthGuard)
  async getJob(@Param('jobId') id: string, @Req() req: any) {
    const job = await this.generationsService.getJob(req.user.userId ?? req.user.id, id);
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  @Delete(':jobId')
  @UseGuards(JwtAuthGuard)
  async cancelJob(@Param('jobId') id: string, @Req() req: any) {
    return this.generationsService.cancelJob(req.user.userId ?? req.user.id, id);
  }
}
