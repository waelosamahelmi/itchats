import { Controller, Get, Post, Body, Req, UseGuards, Inject, Query } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { UsageService } from '../usage/usage.service';
import { PricingService } from '../usage/pricing.service';

@Controller('v1/billing')
export class BillingController {
  constructor(
    @Inject(BillingService) private readonly billingService: BillingService,
    @Inject(UsageService) private readonly usageService: UsageService,
    @Inject(PricingService) private readonly pricingService: PricingService,
  ) {}

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
    const validPlans = ['free', 'starter', 'pro', 'unlimited'];
    if (!body.planId || !validPlans.includes(body.planId)) {
      return {
        url: null,
        sessionId: null,
        error: `Invalid plan ID "${body.planId}". Valid plans: ${validPlans.join(', ')}`,
        mode: 'credits-only',
      };
    }
    try {
      return await this.billingService.createCheckoutSession(req.user.userId, body.planId, req.user.email ?? '');
    } catch (err: any) {
      return {
        url: null,
        sessionId: null,
        error: err.message || 'Checkout creation failed',
        mode: 'credits-only',
      };
    }
  }

  @Post('seed-plans')
  async seedPlans() {
    return this.billingService.seedDefaultPlans();
  }

  @Post('webhook')
  async webhook(@Body() body: any, @Req() req: any) {
    return this.billingService.handleStripeWebhook(body, req.headers?.['stripe-signature']);
  }

  @Get('usage-stats')
  @UseGuards(JwtAuthGuard)
  async getUsageStats(@Req() req: any, @Query('days') days?: string) {
    const lookbackDays = Math.min(Math.max(Number(days) || 30, 1), 90);
    const usageEvents = await this.usageService.getUserUsage(req.user.userId, 500);

    // Aggregate by feature type
    const stats = {
      periodDays: lookbackDays,
      totalCreditsUsed: 0,
      totalProviderCostMinor: 0,
      breakdown: {
        chatMessages: { count: 0, credits: 0, costMinor: 0 },
        imageGenerations: { count: 0, credits: 0, costMinor: 0 },
        videoGenerations: { count: 0, credits: 0, costMinor: 0 },
        voiceTranscriptions: { count: 0, credits: 0, costMinor: 0 },
        ttsGenerations: { count: 0, credits: 0, costMinor: 0 },
        reactions: { count: 0, credits: 0, costMinor: 0 },
        relationshipEvals: { count: 0, credits: 0, costMinor: 0 },
      },
    };

    const cutoff = new Date(Date.now() - lookbackDays * 86400000);
    for (const event of usageEvents) {
      if (event.startedAt && new Date(event.startedAt as any) < cutoff) continue;
      const charge = Number(event.customerChargeMinor ?? 0);
      const cost = Number(event.actualCostMinor ?? 0);
      stats.totalCreditsUsed += charge;
      stats.totalProviderCostMinor += cost;

      const feature = (event.feature as string) || '';
      if (feature.includes('chat') || feature.includes('message')) {
        stats.breakdown.chatMessages.count++;
        stats.breakdown.chatMessages.credits += charge;
        stats.breakdown.chatMessages.costMinor += cost;
      } else if (feature.includes('image') || feature.includes('selfie') || feature.includes('photo')) {
        stats.breakdown.imageGenerations.count++;
        stats.breakdown.imageGenerations.credits += charge;
        stats.breakdown.imageGenerations.costMinor += cost;
      } else if (feature.includes('video')) {
        stats.breakdown.videoGenerations.count++;
        stats.breakdown.videoGenerations.credits += charge;
        stats.breakdown.videoGenerations.costMinor += cost;
      } else if (feature.includes('asr') || feature.includes('transcri')) {
        stats.breakdown.voiceTranscriptions.count++;
        stats.breakdown.voiceTranscriptions.credits += charge;
        stats.breakdown.voiceTranscriptions.costMinor += cost;
      } else if (feature.includes('tts') || feature.includes('voice')) {
        stats.breakdown.ttsGenerations.count++;
        stats.breakdown.ttsGenerations.credits += charge;
        stats.breakdown.ttsGenerations.costMinor += cost;
      } else if (feature.includes('reaction')) {
        stats.breakdown.reactions.count++;
        stats.breakdown.reactions.credits += charge;
        stats.breakdown.reactions.costMinor += cost;
      } else if (feature.includes('relationship')) {
        stats.breakdown.relationshipEvals.count++;
        stats.breakdown.relationshipEvals.credits += charge;
        stats.breakdown.relationshipEvals.costMinor += cost;
      }
    }

    return stats;
  }

  /** Estimate cost for a given usage scenario */
  @Post('estimate-cost')
  @UseGuards(JwtAuthGuard)
  async estimateCost(@Body() body: { provider: string; model: string; operation: string; inputTokens?: number; outputTokens?: number; imageCount?: number; audioSeconds?: number; videoSeconds?: number }) {
    const providerCost = await this.pricingService.estimateProviderCost(body);
    const customerPrice = this.pricingService.calculateCustomerPrice(providerCost.costMinor);
    return {
      providerCostMinor: providerCost.costMinor,
      customerPriceMinor: customerPrice,
      currency: providerCost.currency,
      marginMultiplier: 5,
    };
  }
}
