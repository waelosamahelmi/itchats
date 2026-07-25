import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { getConfig } from '@itchats/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { JwtAuthGuard, OptionalJwtAuthGuard } from './jwt.guard';

const config = getConfig();
const hasGoogle = !!(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET);

const providers: any[] = [AuthService, JwtStrategy, JwtAuthGuard, OptionalJwtAuthGuard];
if (hasGoogle) {
  providers.push(GoogleStrategy);
}

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({ secret: config.JWT_SECRET, signOptions: { expiresIn: config.JWT_EXPIRES_IN } }),
  ],
  controllers: [AuthController],
  providers,
  exports: [AuthService, JwtModule, PassportModule, JwtAuthGuard, OptionalJwtAuthGuard],
})
export class AuthModule {}
