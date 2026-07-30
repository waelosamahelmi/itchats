import { Module, OnModuleInit } from '@nestjs/common';
import { VoicesController } from './voices.controller';
import { VoicesService } from './voices.service';
import { VoiceGeneratorService } from './voice-generator.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [VoicesController],
  providers: [VoicesService, VoiceGeneratorService],
  exports: [VoicesService],
})
export class VoicesModule implements OnModuleInit {
  constructor(private readonly voiceGenerator: VoiceGeneratorService) {}

  onModuleInit() {
    this.voiceGenerator.seedOnStartup().catch((err) => {
      console.error('Voice seeding on startup failed:', err.message);
    });
  }
}
