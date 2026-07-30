import { Controller, Get, Patch, Delete, Post, Param, Body, Req, UseGuards, Inject, BadRequestException, Query } from '@nestjs/common';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { UsersService } from './users.service';
import { PostsService } from '../posts/posts.service';
import { WizardSaveSchema } from '@itchats/contracts';

@Controller('v1/users')
export class UsersController {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(PostsService) private readonly postsService: PostsService,
  ) {}

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

  // ── Friends (current user) ──
  @Get('friends')
  @UseGuards(JwtAuthGuard)
  async getMyFriends(@Req() req: any) {
    return this.usersService.getMyFriends(req.user.userId);
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

  @Get(':id/posts')
  @UseGuards(OptionalJwtAuthGuard)
  async getUserPosts(
    @Param('id') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Req() req: any,
  ) {
    return this.postsService.getUserPosts(req?.user?.userId || '', userId, Number(page), Number(limit));
  }

  @Get(':id/photos')
  @UseGuards(OptionalJwtAuthGuard)
  async getUserPhotos(@Param('id') userId: string) {
    return this.postsService.getUserPhotos(userId);
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

  // ── Profile Wizard ──
  @Patch('me/wizard')
  @UseGuards(JwtAuthGuard)
  async saveWizard(@Req() req: any, @Body() body: unknown) {
    const data = WizardSaveSchema.parse(body);
    return this.usersService.saveWizard(req.user.userId, data);
  }
}
