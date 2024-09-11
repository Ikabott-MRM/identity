import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { HeaderApiKeyStrategy } from './strategies/header-api-key-strategy';
import { ApiKeysService } from './api-keys.service';
import { KnexModule } from 'src/db/knex.module';

@Module({
  imports: [PassportModule, KnexModule],
  providers: [ApiKeysService, AuthService, HeaderApiKeyStrategy],
})
export class AuthModule {}
