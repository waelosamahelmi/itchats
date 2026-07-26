import { Module } from '@nestjs/common';
import { DailyLifeService } from './daily-life.service';

@Module({
  providers: [DailyLifeService],
  exports: [DailyLifeService],
})
export class DailyLifeModule {}
