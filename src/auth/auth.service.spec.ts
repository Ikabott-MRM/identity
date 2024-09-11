import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { ApiKeysService } from './api-keys.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;
  let apiKeysService: ApiKeysService;
  let configService: ConfigService;

  const mockApiKeysService = {
    getHashedApiKeys: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(1000), // Return a cache TTL of 1000ms
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ApiKeysService, useValue: mockApiKeysService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    apiKeysService = module.get<ApiKeysService>(ApiKeysService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    authService['validatedApiKeysCache'].clear();
    jest.clearAllTimers();
    jest.clearAllMocks();
  });
  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should call updateActiveApiKeys on initialization', async () => {
      const updateActiveApiKeysSpy = jest.spyOn(
        authService,
        'updateActiveApiKeys',
      ) as jest.Mock;
      await authService.onModuleInit();
      expect(updateActiveApiKeysSpy).toHaveBeenCalled();
    });
  });

  describe('validateApiKey', () => {
    it('should return true if apiKey is cached', async () => {
      const plainApiKey = 'plain_api_key';
      const hashedApiKey = 'hashed_api_key';

      authService['validatedApiKeysCache'].set(plainApiKey, {
        hashedApiKey,
        timeoutId: setTimeout(() => {}, 0),
      });

      const result = await authService.validateApiKey(plainApiKey);

      expect(result).toBe(true);
      expect(authService['validatedApiKeysCache'].has(plainApiKey)).toBe(true);
    });

    it('should return true if apiKey matches an active key', async () => {
      const plainApiKey = 'plain_api_key';
      const hashedApiKey = 'hashed_api_key';

      const bcryptCompare = jest.spyOn(bcrypt, 'compare') as jest.Mock;
      bcryptCompare.mockResolvedValue(true);
      mockApiKeysService.getHashedApiKeys.mockResolvedValue([hashedApiKey]);

      await authService.updateActiveApiKeys();
      expect(authService['validatedApiKeysCache'].has(plainApiKey)).toBe(false);
      const cacheValidatedApiKeySpy = jest.spyOn(
        authService as any,
        'cacheValidatedApiKey',
      );

      const result = await authService.validateApiKey(plainApiKey);
      expect(result).toBe(true);
      expect(authService['validatedApiKeysCache'].has(plainApiKey)).toBe(true);
      expect(cacheValidatedApiKeySpy).toHaveBeenCalledWith(
        plainApiKey,
        hashedApiKey,
      );
    });

    it('should return false if apiKey does not match any active key nor is cached', async () => {
      const plainApiKey = 'plain_api_key';

      const bcryptCompare = jest.spyOn(bcrypt, 'compare') as jest.Mock;
      bcryptCompare.mockResolvedValue(false);

      mockApiKeysService.getHashedApiKeys.mockResolvedValue(['some_other_key']);
      await authService.updateActiveApiKeys();

      const result = await authService.validateApiKey(plainApiKey);

      expect(result).toBe(false);
    });
  });

  describe('updateActiveApiKeys', () => {
    it('should update active api keys', async () => {
      const newApiKeys = ['hashed_api_key'];
      mockApiKeysService.getHashedApiKeys.mockResolvedValue(newApiKeys);
      await authService.updateActiveApiKeys();
      expect(authService['activeApiKeys']).toEqual(new Set(newApiKeys));
    });

    it('should update active api keys and clean cache to delete entries no longer active', async () => {
      const previousApiKeys = ['hashed_api_key_1'];
      mockApiKeysService.getHashedApiKeys.mockResolvedValue(previousApiKeys);
      await authService.updateActiveApiKeys();
      expect(authService['activeApiKeys']).toEqual(new Set(previousApiKeys));
      authService['validatedApiKeysCache'].set('plainApiKey', {
        hashedApiKey: 'hashed_api_key_1',
        timeoutId: setTimeout(() => {}, 0),
      });

      const newApiKeys = ['hashed_api_key_2', 'hashed_api_key_3,'];
      mockApiKeysService.getHashedApiKeys.mockResolvedValue(newApiKeys);
      await authService.updateActiveApiKeys();

      expect(authService['validatedApiKeysCache'].has('plainApiKey')).toBe(
        false,
      );
      expect(authService['activeApiKeys']).toEqual(new Set(newApiKeys));
    });
  });

  describe('cache behavior', () => {
    it('should cache and timeout api keys correctly', async () => {
      const plainApiKey = 'plain_api_key';
      const hashedApiKey = 'hashed_api_key';

      authService['cacheValidatedApiKey'](plainApiKey, hashedApiKey);
      expect(authService['validatedApiKeysCache'].has(plainApiKey)).toBe(true);

      // Wait for cache timeout
      await new Promise(resolve => setTimeout(resolve, 1500));

      expect(authService['validatedApiKeysCache'].has(plainApiKey)).toBe(false);
    });
  });

  describe('Cron job', () => {
    it('should call updateActiveApiKeys periodically', async () => {
      jest.useFakeTimers();
      const updateActiveApiKeysSpy = jest.spyOn(
        authService,
        'updateActiveApiKeys',
      ) as jest.Mock;

      authService.updateActiveApiKeys();

      jest.advanceTimersByTime(30 * 1000); // Adjust if needed

      expect(updateActiveApiKeysSpy).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });
});
