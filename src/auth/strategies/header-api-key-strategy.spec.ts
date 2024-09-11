import { AuthService } from '../auth.service';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { HeaderApiKeyStrategy } from './header-api-key-strategy';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';

describe('LocalStrategy', () => {
  let strategy: HeaderAPIKeyStrategy;
  let authService: jest.Mocked<AuthService>;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HeaderApiKeyStrategy,
        {
          provide: AuthService,
          useValue: {
            validateApiKey: jest.fn(), // Mock the validateApiKey method
          },
        },
      ],
    }).compile();

    strategy = module.get<HeaderApiKeyStrategy>(HeaderApiKeyStrategy);
    authService = module.get(AuthService);
  });

  it('should throw UnauthorizedException if apiKey is empty', () => {
    const done = jest.fn();
    strategy['validate']('', done);
    expect(done).toHaveBeenCalledWith(expect.any(UnauthorizedException), null);
  });

  it('should return true if apiKey is valid', async () => {
    const apiKey = 'valid-api-key';
    authService.validateApiKey.mockResolvedValueOnce(true);
    const done = jest.fn();
    await strategy['validate'](apiKey, done);

    expect(authService.validateApiKey).toHaveBeenCalledWith(apiKey);
    expect(done).toHaveBeenCalledWith(null, true);
  });

  it('should throw UnauthorizedException if apiKey is invalid', async () => {
    const apiKey = 'invalid-api-key';
    authService.validateApiKey.mockResolvedValueOnce(false);

    const done = jest.fn();
    await strategy['validate'](apiKey, done);

    expect(authService.validateApiKey).toHaveBeenCalledWith(apiKey);

    expect(done).toHaveBeenCalledWith(expect.any(UnauthorizedException), null);
  });

  afterAll(() => {
    jest.clearAllMocks();
  });
});
