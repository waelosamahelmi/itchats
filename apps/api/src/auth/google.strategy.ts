import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { getConfig } from '@itchats/config';

export interface OAuthProfile {
  provider: 'google' | 'github';
  providerId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    const cfg = getConfig();
    const apiBase = process.env.API_BASE_URL ?? 'http://localhost:' + cfg.PORT;
    super({
      clientID: cfg.GOOGLE_CLIENT_ID!,
      clientSecret: cfg.GOOGLE_CLIENT_SECRET!,
      callbackURL: apiBase + '/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const { id, emails, displayName, photos } = profile;
    const oauth: OAuthProfile = {
      provider: 'google',
      providerId: id,
      email: emails?.[0]?.value ?? '',
      name: displayName ?? '',
      avatarUrl: photos?.[0]?.value,
    };
    done(null, oauth);
  }
}