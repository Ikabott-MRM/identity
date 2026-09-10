import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface DidJwtPayload {
  sub: string;
  scope?: string[];
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
}

export interface DidJwtUser {
  did: string;
  scope: string[];
}

@Injectable()
export class DidJwtStrategy extends PassportStrategy(Strategy, 'did-jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('didAuth.jwtSecret') ||
        'dev-only-did-auth-jwt-secret-change-me',
      issuer: configService.get<string>('publicApiBaseUrl'),
      audience: configService.get<string>('didAuth.audience') || 'ssi-citizen',
      algorithms: ['HS256'],
    });
  }

  validate(payload: DidJwtPayload): DidJwtUser {
    if (!payload?.sub) {
      throw new UnauthorizedException('Token missing subject.');
    }
    return {
      did: payload.sub,
      scope: Array.isArray(payload.scope) ? payload.scope : [],
    };
  }
}
