import { Controller, Post, Get, Body, Req, UseGuards, HttpCode, HttpStatus, Res, Inject } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterSchema, LoginSchema } from '@itchats/contracts';
import { JwtAuthGuard } from './jwt.guard';
import { getConfig } from '@itchats/config';
import type { OAuthProfile } from './google.strategy';
import type { FastifyReply } from 'fastify';

@Controller('v1/auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: unknown) {
    const { email, username, password, dateOfBirth, agreedToTerms } = RegisterSchema.parse(body);
    return this.authService.register(email, username, password, dateOfBirth, agreedToTerms);
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

  @Get('google-url')
  googleUrl() {
    const config = getConfig();
    const clientId = config.GOOGLE_CLIENT_ID;
    if (!clientId) return { url: null, error: 'not_configured' };
    const redirectUri = `${config.CORS_ORIGIN}/v1/auth/google/callback`;
    const scope = 'email profile';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    return { url };
  }

  @Get('google')
  async googleAuth(@Res({ passthrough: false }) res: FastifyReply): Promise<void> {
    const config = getConfig();
    const clientId = config.GOOGLE_CLIENT_ID;
    if (!clientId) {
      res.status(400).send({ message: 'Google OAuth not configured' });
      return;
    }
    const redirectUri = `${config.CORS_ORIGIN}/v1/auth/google/callback`;
    const scope = 'email profile';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    res.redirect(url, 302);
  }

  @Get('google/callback')
  async googleCallback(@Req() req: any, @Res({ passthrough: false }) res: FastifyReply): Promise<void> {
    const config = getConfig();
    const { code } = req.query;
    if (!code) {
      res.redirect(`${config.CORS_ORIGIN}/auth?error=no_code`, 302);
      return;
    }
    try {
      const redirectUri = `${config.CORS_ORIGIN}/v1/auth/google/callback`;
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(code),
          client_id: config.GOOGLE_CLIENT_ID,
          client_secret: config.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
      });
      const tokens = await tokenRes.json() as any;
      if (!tokens.access_token) {
        res.redirect(`${config.CORS_ORIGIN}/auth?error=token_exchange_failed`, 302);
        return;
      }
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const googleUser = await userRes.json() as any;
      const oauth: OAuthProfile = {
        provider: 'google',
        providerId: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        avatarUrl: googleUser.picture,
      };
      const result = await this.authService.oauthLogin(oauth);
      res.redirect(`${config.CORS_ORIGIN}/auth/callback?token=${result.accessToken}&refresh=${result.refreshToken}`, 302);
    } catch (err: any) {
      res.redirect(`${config.CORS_ORIGIN}/auth?error=oauth_failed`, 302);
    }
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
