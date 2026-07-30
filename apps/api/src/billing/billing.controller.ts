import { Controller, Get, Post, Body, Req, UseGuards, Inject } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('v1/billing')
export class BillingController {
  constructor(@Inject(BillingService) private readonly billingService: BillingService) {}

  @Get('config')
  async getConfig() {
    return { stripeConfigured: this.billingService.isStripeConfigured(), mode: this.billingService.isStripeConfigured() ? 'full' : 'credits-only' };
  }

  @Get('plans')
  async getPlans() {
    return this.billingService.getPlans();
  }

  @Get('wallet')
  @UseGuards(JwtAuthGuard)
  async getWallet(@Req() req: any) {
    return this.billingService.getWallet(req.user.userId);
  }

  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  async getSubscription(@Req() req: any) {
    const sub = await this.billingService.getUserSubscription(req.user.userId);
    // Return a mock free-tier subscription if no Stripe and no subscription exists
    if (!sub && !this.billingService.isStripeConfigured()) {
      return {
        planId: 'free',
        status: 'active',
        provider: 'credits-only',
        currentPeriodStart: new Date(0),
        currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
        message: 'Credits-only mode',
      };
    }
    return sub;
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckout(@Body() body: { planId: string }, @Req() req: any) {
    return this.billingService.createCheckoutSession(req.user.userId, body.planId, req.user.email ?? '');
  }

  @Post('seed-plans')
  async seedPlans() {
    return this.billingService.seedDefaultPlans();
  }

  @Post('webhook')
  async webhook(@Body() body: any, @Req() req: any) {
    return this.billingService.handleStripeWebhook(body, req.headers?.['stripe-signature']);
  }
}
