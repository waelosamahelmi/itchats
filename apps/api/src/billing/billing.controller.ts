import { Controller, Get, Post, Body } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { subscriptionPlans, userSubscriptions, creditWallets } from '@itchats/database/schema';

@Controller('v1/billing')
export class BillingController {
  @Get('plans')
  async getPlans() {
    const db = getDb();
    return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.active, 'true'));
  }

  @Get('wallet')
  async getWallet() {
    const db = getDb();
    const [wallet] = await db.select().from(creditWallets)
      .where(eq(creditWallets.userId, '00000000-0000-0000-0000-000000000001'))
      .limit(1);
    return wallet ?? { balance: 0 };
  }

  @Get('subscription')
  async getSubscription() {
    const db = getDb();
    const [sub] = await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.userId, '00000000-0000-0000-0000-000000000001'))
      .limit(1);
    return sub ?? { status: 'none' };
  }
}
