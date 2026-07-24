import { Controller, Get, Post, Param, Query, UseGuards, Inject } from '@nestjs/common';
import { TreasuryService } from '../treasury/treasury.service';
import { UsageService } from '../usage/usage.service';
import { MarginGuard } from '../usage/margin-guard.service';
import { PricingService } from '../usage/pricing.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('v1/admin/finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(
    @Inject(TreasuryService) private readonly treasury: TreasuryService,
    @Inject(UsageService) private readonly usage: UsageService,
    @Inject(MarginGuard) private readonly marginGuard: MarginGuard,
    @Inject(PricingService) private readonly pricing: PricingService,
  ) {}

  @Get('overview')
  async overview() {
    return this.treasury.getProviderOverview();
  }

  @Get('safe-withdrawable')
  async safeWithdrawable() {
    return this.treasury.getSafeWithdrawable();
  }

  @Get('snapshots')
  async snapshots(@Query('days') days = '30') {
    const { getDb } = await import('@itchats/database');
    const { treasurySnapshots } = await import('@itchats/database/schema/treasury');
    const { desc } = await import('drizzle-orm');
    const db = getDb();
    return db.select().from(treasurySnapshots).orderBy(desc(treasurySnapshots.createdAt)).limit(parseInt(days));
  }

  @Post('snapshot')
  async takeSnapshot() {
    return this.treasury.takeSnapshot();
  }

  @Post('pricing/seed-alibaba')
  async seedPricing() {
    await this.pricing.seedAlibabaPricing();
    return { seeded: true };
  }

  @Get('margins')
  async margins(@Query('provider') provider?: string) {
    return { message: 'Margin data available via treasury overview' };
  }

  @Post('recalculate-reserves')
  async recalculateReserves() {
    await this.treasury.takeSnapshot();
    return this.treasury.getSafeWithdrawable();
  }
}
