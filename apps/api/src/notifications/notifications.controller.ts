import { Controller, Get, Post, Param, Req, UseGuards, Inject } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('v1/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly service: NotificationsService) {}

  @Get()
  async list(@Req() req: any) {
    return this.service.list(req.user.id);
  }

  @Get('unread-count')
  async unreadCount(@Req() req: any) {
    return this.service.unreadCount(req.user.id);
  }

  @Post(':id/read')
  async markRead(@Param('id') id: string, @Req() req: any) {
    return this.service.markRead(req.user.id, id);
  }

  @Post('read-all')
  async markAllRead(@Req() req: any) {
    return this.service.markAllRead(req.user.id);
  }
}
