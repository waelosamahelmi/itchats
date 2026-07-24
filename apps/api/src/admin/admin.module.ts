import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { TreasuryModule } from '../treasury/treasury.module';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [TreasuryModule, UsageModule],
  controllers: [FinanceController],
})
export class AdminModule {}
