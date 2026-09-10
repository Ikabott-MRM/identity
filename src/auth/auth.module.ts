import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { HeaderApiKeyStrategy } from './strategies/header-api-key-strategy';
import { DidJwtStrategy } from './strategies/did-jwt.strategy';
import { ApiKeysService } from './api-keys.service';
import { KnexModule } from 'src/db/knex.module';
import { DidAuthService } from './did-auth/did-auth.service';
import { DidAuthController } from './did-auth/did-auth.controller';
import { DidJwtAuthGuard } from './guards/did-jwt-auth.guard';
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'api-key' }), KnexModule],
  controllers: [DidAuthController],
  providers: [
    ApiKeysService,
    AuthService,
    HeaderApiKeyStrategy,
    DidJwtStrategy,
    DidAuthService,
    DidJwtAuthGuard,
    ApiKeyAuthGuard,
  ],
  exports: [DidAuthService, DidJwtAuthGuard, DidJwtStrategy, AuthService, PassportModule],
})
export class AuthModule {}
