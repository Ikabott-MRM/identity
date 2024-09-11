import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

interface CacheEntry {
  hashedApiKey: string;
  timeoutId: NodeJS.Timeout;
}

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private configService: ConfigService,
  ) {}

  private readonly logger = new Logger(AuthService.name);
  private activeApiKeys: Set<string>;
  private validatedApiKeysCache = new Map<string, CacheEntry>();

  private cacheTTL = this.configService.get('apiKeys.cacheTTL');
  async onModuleInit() {
    await this.updateActiveApiKeys();
  }

  private isApiKeyCached(apiKey: string): boolean {
    return this.validatedApiKeysCache.has(apiKey);
  }

  private cacheValidatedApiKey(apiKey: string, hashedApiKey: string) {
    this.validatedApiKeysCache.set(apiKey, {
      hashedApiKey,
      timeoutId: setTimeout(() => {
        this.validatedApiKeysCache.delete(apiKey);
      }, this.cacheTTL),
    });
  }

  private updateTimeout(plainApiKey: string) {
    const cacheEntry = this.validatedApiKeysCache.get(plainApiKey);

    if (cacheEntry) {
      clearTimeout(cacheEntry.timeoutId);

      // Update the entry with new timeout
      cacheEntry.timeoutId = setTimeout(() => {
        this.validatedApiKeysCache.delete(plainApiKey);
      }, this.cacheTTL);
    }
  }

  //TODO definir cada cuanto quiero que se actualicen
  @Cron(CronExpression.EVERY_30_SECONDS)
  async updateActiveApiKeys() {
    this.logger.log('Updating active api-keys...');
    this.activeApiKeys = new Set(await this.apiKeysService.getHashedApiKeys());
    if (!Boolean(this.activeApiKeys.size)) {
      this.logger.warn(
        `There are no active api-keys. Endpoints are currently unprotected.`,
      );
    } else {
      this.logger.log(
        `Active api-keys have been updated. Total active api-keys: ${this.activeApiKeys.size}`,
      );
    }

    this.validatedApiKeysCache.forEach((cacheEntry, plainApiKey) => {
      if (!this.activeApiKeys.has(cacheEntry.hashedApiKey)) {
        this.validatedApiKeysCache.delete(plainApiKey);
      }
    });
  }

  async validateApiKey(plainApiKey: string): Promise<boolean> {
    if (this.isApiKeyCached(plainApiKey)) {
      this.logger.log('api-key validated from cache.');
      this.updateTimeout(plainApiKey);
      return true;
    }

    for (const activeApiKey of this.activeApiKeys) {
      const matches = await bcrypt.compare(plainApiKey, activeApiKey);
      if (matches) {
        this.logger.log(`api-key has been validated and added to cache.`);
        this.cacheValidatedApiKey(plainApiKey, activeApiKey);
        return true;
      }
    }
    return false;
  }
}
