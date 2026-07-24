import { Module } from '@nestjs/common';
import { UsageService } from './usage.service';
import { MarginGuard } from './margin-guard.service';
import { PricingService } from './pricing.service';
import { TreasuryModule } from '../treasury/treasury.module';

@Module({
  imports: [TreasuryModule],
  providers: [UsageService, MarginGuard, PricingService],
  exports: [UsageService, MarginGuard, PricingService],
})
export class UsageModule {}
