import { Controller, Post, Get, Body, Req, UseGuards, HttpCode, HttpStatus, Res, Inject } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterSchema, LoginSchema } from '@itchats/contracts';
import { JwtAuthGuard } from './jwt.guard';
import { getConfig } from '@itchats/config';
import type { OAuthProfile } from './google.strategy';
import type { Response } from 'express';

@Controller('v1/auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: unknown) {
    const { email, username, password } = RegisterSchema.parse(body);
    return this.authService.register(email, username, password);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: unknown, @Req() req: any) {
    const { email, password } = LoginSchema.parse(body);
    return this.authService.login(email, password, {
      userAgent: req.headers?.['user-agent'],
      ip: req.ip,
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    return this.authService.logout(req.user.userId);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(@Req() req: any) {
    return this.authService.logout(req.user.userId);
  }

  // ── SSO / OAuth ──

  @Get('google-status')
  googleStatus() {
    const config = getConfig();
    const available = !!(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET);
    return { available, provider: 'google' };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Initiates Google OAuth flow — redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const oauth = req.user as OAuthProfile;
    const result = await this.authService.oauthLogin(oauth);
    const frontend = getConfig().CORS_ORIGIN;
    res.redirect(`${frontend}/auth/callback?token=${result.accessToken}&refresh=${result.refreshToken}`);
  }

  @Post('link/google')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async linkGoogle(@Req() req: any, @Body() body: { oauthProfile: OAuthProfile }) {
    return this.authService.linkOAuthAccount(req.user.userId, body.oauthProfile);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@Req() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.authService.changePassword(req.user.userId, body.currentPassword, body.newPassword);
  }
}
