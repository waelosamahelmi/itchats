import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule implements OnModuleInit {
  private readonly logger = new Logger(BillingModule.name);

  constructor(private readonly billingService: BillingService) {}

  async onModuleInit() {
    try {
      const result = await this.billingService.seedDefaultPlans();
      if (result.seeded > 0) {
        this.logger.log(`Seeded ${result.seeded}/${result.total} default subscription plans`);
      }
    } catch (err: any) {
      this.logger.warn(`Could not seed plans (DB may not be ready): ${err.message}`);
    }
  }
}
