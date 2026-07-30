import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { TreasuryModule } from '../treasury/treasury.module';
import { UsageModule } from '../usage/usage.module';
import { RelationshipCheatsController } from './relationship-cheats.controller';
import { AdminRoleGuard } from './admin-role.guard';
import { AdminUsersController } from './admin-users.controller';
import { AdminCharactersController } from './admin-characters.controller';
import { AdminContentController } from './admin-content.controller';
import { AdminReportsController } from './admin-reports.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminSettingsController } from './admin-settings.controller';

@Module({
  imports: [TreasuryModule, UsageModule],
  controllers: [
    FinanceController,
    RelationshipCheatsController,
    AdminUsersController,
    AdminCharactersController,
    AdminContentController,
    AdminReportsController,
    AdminDashboardController,
    AdminSettingsController,
  ],
  providers: [AdminRoleGuard],
})
export class AdminModule {}
