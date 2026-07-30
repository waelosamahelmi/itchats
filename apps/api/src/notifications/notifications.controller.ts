import { Controller, Get, Post, Delete, Param, Body, Req, UseGuards, Inject } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { getConfig } from '@itchats/config';
import { z } from 'zod';

const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

@Controller('v1/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly service: NotificationsService) {}

  @Get()
  async list(@Req() req: any) {
    return this.service.list(req.user.userId);
  }

  @Get('unread-count')
  async unreadCount(@Req() req: any) {
    return this.service.unreadCount(req.user.userId);
  }

  @Post(':id/read')
  async markRead(@Param('id') id: string, @Req() req: any) {
    return this.service.markRead(req.user.userId, id);
  }

  @Post('read-all')
  async markAllRead(@Req() req: any) {
    return this.service.markAllRead(req.user.userId);
  }

  // ── Push Subscription Management ──

  @Get('vapid-public-key')
  getVapidPublicKey() {
    const config = getConfig();
    return { publicKey: config.VAPID_PUBLIC_KEY ?? null };
  }

  @Post('push-subscribe')
  async subscribe(@Body() body: unknown, @Req() req: any) {
    const input = PushSubscriptionSchema.parse(body);
    return this.service.subscribePush(req.user.userId, input.endpoint, input.keys.p256dh, input.keys.auth);
  }

  @Delete('push-unsubscribe/:subscriptionId')
  async unsubscribe(@Param('subscriptionId') id: string) {
    return this.service.unsubscribePush(id);
  }
}
