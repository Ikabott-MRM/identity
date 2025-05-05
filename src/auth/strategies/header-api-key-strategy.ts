import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import Strategy from 'passport-headerapikey';
import { AuthService } from '../auth.service';

@Injectable()
export class HeaderApiKeyStrategy extends PassportStrategy(
  Strategy,
  'api-key',
) {
  constructor(private readonly authService: AuthService) {
    super(
      { header: 'Authorization', prefix: 'Bearer ' },
      false,
      async (apiKey: string, done: (error: Error, data: any) => void) => {
        return await this.validate(apiKey, done);
      },
    );
  }

  public validate = async (
    apiKey: string,
    done: (error: Error, data: any) => void,
  ) => {
    if (!Boolean(apiKey)) return done(new UnauthorizedException(), null);
    if (await this.authService.validateApiKey(apiKey)) return done(null, true);
    return done(new UnauthorizedException(), null);
  };
}
