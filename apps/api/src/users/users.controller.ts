import { Controller, Get, Patch, Delete, Post, Param, Body, Req, UseGuards, Inject, BadRequestException, Query, Res, HttpCode, HttpStatus, UseInterceptors, UploadedFile } from '@nestjs/common';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { UsersService } from './users.service';
import { PostsService } from '../posts/posts.service';
import { WizardSaveSchema } from '@itchats/contracts';
import { MediaService } from '../media/media.service';

@Controller('v1/users')
export class UsersController {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(PostsService) private readonly postsService: PostsService,
    @Inject(MediaService) private readonly mediaService: MediaService,
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
      bio?: string;
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
    // Support both JSON body and multipart upload
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      // Handle multipart upload
      try {
        const data = await (req as any).body();
        const file = data?.avatar || data?.file || data?.image;
        if (!file) throw new BadRequestException('No avatar file provided. Use field name "avatar" or "image".');

        const buffer = await file.toBuffer();
        const mimeType = file.mimetype || 'image/jpeg';
        const fileName = file.filename || `avatar-${Date.now()}.jpg`;
        const fileSize = buffer.length;

        // Validate image type
        const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedImageTypes.includes(mimeType)) {
          throw new BadRequestException(`Unsupported image type: ${mimeType}. Allowed: ${allowedImageTypes.join(', ')}`);
        }
        if (fileSize > 10 * 1024 * 1024) {
          throw new BadRequestException('Avatar image too large. Maximum 10MB.');
        }

        // Upload via media service
        const result = await this.mediaService.createUploadUrl(req.user.userId, mimeType, fileName, fileSize, 'public');
        // Store the local file
        await this.mediaService.storeLocalFile(result.mediaAssetId, buffer.toString('base64'));
        // Get download URL
        const { url: avatarUrl } = await this.mediaService.getDownloadUrl(result.mediaAssetId);

        return this.usersService.updateAvatar(req.user.userId, avatarUrl, result.mediaAssetId);
      } catch (err: any) {
        if (err.status) throw err;
        throw new BadRequestException(err.message || 'Avatar upload failed');
      }
    }

    // Fallback: accept JSON body with avatarUrl
    const body = req.body;
    const avatarUrl = body?.avatarUrl || body?.url;
    if (!avatarUrl) throw new BadRequestException('avatarUrl is required');
    return this.usersService.updateAvatar(req.user.userId, avatarUrl);
  }

  @Post('cover')
  @UseGuards(JwtAuthGuard)
  async uploadCover(@Req() req: any) {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      try {
        const data = await (req as any).body();
        const file = data?.cover || data?.file || data?.image;
        if (!file) throw new BadRequestException('No cover image file provided. Use field name "cover" or "image".');

        const buffer = await file.toBuffer();
        const mimeType = file.mimetype || 'image/jpeg';
        const fileName = file.filename || `cover-${Date.now()}.jpg`;
        const fileSize = buffer.length;

        const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedImageTypes.includes(mimeType)) {
          throw new BadRequestException(`Unsupported image type: ${mimeType}. Allowed: ${allowedImageTypes.join(', ')}`);
        }
        if (fileSize > 10 * 1024 * 1024) {
          throw new BadRequestException('Cover image too large. Maximum 10MB.');
        }

        const result = await this.mediaService.createUploadUrl(req.user.userId, mimeType, fileName, fileSize, 'public');
        await this.mediaService.storeLocalFile(result.mediaAssetId, buffer.toString('base64'));
        const { url: coverPhotoUrl } = await this.mediaService.getDownloadUrl(result.mediaAssetId);

        return this.usersService.updateCoverPhoto(req.user.userId, coverPhotoUrl);
      } catch (err: any) {
        if (err.status) throw err;
        throw new BadRequestException(err.message || 'Cover upload failed');
      }
    }

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

  // ── Settings ──
  @Get('me/settings')
  @UseGuards(JwtAuthGuard)
  async getSettings(@Req() req: any) {
    return this.usersService.getUserSettings(req.user.userId);
  }

  @Patch('me/settings')
  @UseGuards(JwtAuthGuard)
  async updateSettings(
    @Body() body: {
      privateAccount?: boolean;
      discoverable?: boolean;
      charVisibility?: string;
      nsfwFilter?: boolean;
      contentLanguage?: string;
      notificationPreferences?: Record<string, boolean>;
    },
    @Req() req: any,
  ) {
    return this.usersService.updateUserSettings(req.user.userId, body);
  }

  // ── Blocked Users ──
  @Get('me/blocked')
  @UseGuards(JwtAuthGuard)
  async getBlocked(@Req() req: any) {
    return this.usersService.getBlockedUsers(req.user.userId);
  }

  @Post(':id/block')
  @UseGuards(JwtAuthGuard)
  async blockUser(@Param('id') targetId: string, @Req() req: any) {
    return this.usersService.blockUser(req.user.userId, targetId);
  }

  @Delete(':id/block')
  @UseGuards(JwtAuthGuard)
  async unblockUser(@Param('id') targetId: string, @Req() req: any) {
    return this.usersService.unblockUser(req.user.userId, targetId);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  async searchUsers(@Query('q') q: string, @Req() req: any) {
    return this.usersService.searchUsers(req.user.userId, q || '', 10);
  }
}
