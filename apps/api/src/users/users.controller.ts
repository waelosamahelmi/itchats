import { Controller, Get, Patch, Delete, Post, Param, Body, Req, UseGuards, Inject, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { UsersService } from './users.service';

@Controller('v1/users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    return this.usersService.getMe(req.user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(@Req() req: any, @Body() body: { username?: string; displayName?: string; bio?: string; timezone?: string }) {
    return this.usersService.updateMe(req.user.userId, body);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  async deleteMe(@Req() req: any) {
    return this.usersService.deleteMe(req.user.userId);
  }

  // ── New endpoints ──

  @Get('score')
  @UseGuards(JwtAuthGuard)
  async getScore(@Req() req: any) {
    return this.usersService.getScore(req.user.userId);
  }

  @Get(':handle')
  async getByHandle(@Param('handle') handle: string) {
    return this.usersService.getByHandle(handle);
  }

  @Get(':id/profile')
  @UseGuards(OptionalJwtAuthGuard)
  async getProfile(@Param('id') id: string, @Req() req: any) {
    return this.usersService.getUserProfile(id, req?.user?.userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Body()
    body: {
      displayName?: string;
      about?: string;
      website?: string;
      location?: string;
      coverPhotoUrl?: string;
    },
    @Req() req: any,
  ) {
    return this.usersService.updateProfile(req.user.userId, body);
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  async uploadAvatar(@Req() req: any) {
    // For file upload, we'd use a multipart handler. For now, accept a URL or base64.
    const body = req.body;
    const avatarUrl = body?.avatarUrl || body?.url;
    if (!avatarUrl) throw new BadRequestException('avatarUrl is required');
    return this.usersService.updateAvatar(req.user.userId, avatarUrl);
  }

  @Post('cover')
  @UseGuards(JwtAuthGuard)
  async uploadCover(@Req() req: any) {
    const body = req.body;
    const coverPhotoUrl = body?.coverPhotoUrl || body?.url;
    if (!coverPhotoUrl) throw new BadRequestException('coverPhotoUrl is required');
    return this.usersService.updateCoverPhoto(req.user.userId, coverPhotoUrl);
  }

  @Post(':id/friend')
  @UseGuards(JwtAuthGuard)
  async sendFriendRequest(@Param('id') friendId: string, @Req() req: any) {
    return this.usersService.sendFriendRequest(req.user.userId, friendId);
  }

  @Patch(':id/friend')
  @UseGuards(JwtAuthGuard)
  async handleFriendRequest(
    @Param('id') friendId: string,
    @Body() body: { status: 'accepted' | 'rejected' },
    @Req() req: any,
  ) {
    return this.usersService.handleFriendRequest(req.user.userId, friendId, body.status);
  }

  @Delete(':id/friend')
  @UseGuards(JwtAuthGuard)
  async removeFriend(@Param('id') friendId: string, @Req() req: any) {
    return this.usersService.removeFriend(req.user.userId, friendId);
  }

  @Get(':id/friends')
  @UseGuards(JwtAuthGuard)
  async getFriends(@Param('id') userId: string) {
    return this.usersService.getUserFriends(userId);
  }
}
