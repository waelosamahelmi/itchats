import { Controller, Get, Post, Delete, Param, Body, Query, Req, UseGuards, Inject } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { getConfig } from '@itchats/config';
import { z } from 'zod';

const PushSubscriptionSchema = z.object({
  endpoint: z.string(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

@Controller('v1')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly service: NotificationsService) {}

  // ── Notification Endpoints ──
  @Get('notifications')
  async list(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('unread') unread: string | undefined,
  ) {
    return this.service.list(req.user.userId, Number(page), Number(limit), unread === 'true');
  }

  @Get('notifications/unread-count')
  async unreadCount(@Req() req: any) {
    return this.service.unreadCount(req.user.userId);
  }

  @Post('notifications/:id/read')
  async markRead(@Param('id') id: string, @Req() req: any) {
    return this.service.markRead(req.user.userId, id);
  }

  @Post('notifications/read-all')
  async markAllRead(@Req() req: any) {
    return this.service.markAllRead(req.user.userId);
  }

  // ── Push Subscription Management (dedicated endpoints) ──

  @Get('push/vapid-public-key')
  getVapidPublicKey() {
    const config = getConfig();
    return { publicKey: config.VAPID_PUBLIC_KEY ?? null };
  }

  @Post('push/subscribe')
  async subscribe(@Body() body: unknown, @Req() req: any) {
    const input = PushSubscriptionSchema.parse(body);
    return this.service.subscribePush(
      req.user.userId,
      input.endpoint,
      input.keys.p256dh,
      input.keys.auth,
      req.headers?.['user-agent'],
    );
  }

  @Post('push/unsubscribe')
  async unsubscribe(@Body() body: { endpoint: string }, @Req() req: any) {
    return this.service.unsubscribePushByEndpoint(req.user.userId, body.endpoint);
  }

  @Delete('push/unsubscribe/:subscriptionId')
  async unsubscribeById(@Param('subscriptionId') id: string) {
    return this.service.unsubscribePush(id);
  }
}
