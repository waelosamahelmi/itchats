import { Controller, Post, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterSchema, LoginSchema } from '@itchats/contracts';
import { JwtAuthGuard } from './jwt.guard';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
