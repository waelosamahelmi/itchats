import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { TreasuryModule } from '../treasury/treasury.module';
import { UsageModule } from '../usage/usage.module';
import { RelationshipCheatsController } from './relationship-cheats.controller';
import { AdminRoleGuard } from './admin-role.guard';

@Module({
  imports: [TreasuryModule, UsageModule],
  controllers: [FinanceController, RelationshipCheatsController],
  providers: [AdminRoleGuard],
})
export class AdminModule {}
