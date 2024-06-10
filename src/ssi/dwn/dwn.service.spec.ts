import { Test, TestingModule } from '@nestjs/testing';
import { DWNService } from './dwn.service';
import { AUTHORIZED_CALLER_TOKEN } from './authorized-caller.provider';
import { Logger } from '@nestjs/common';
import { Web5 } from '@web5/api';

jest.mock('@web5/api');

describe('DWNService', () => {
  let web5Mock = Web5 as jest.Mocked<typeof Web5>;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;
  let service: DWNService;

  class MockWeb5 {}

  // Mock the Web5 connect method
  (Web5.connect as jest.Mock).mockResolvedValue({
    web5: new MockWeb5(),
    did: 'test-did',
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DWNService,
        {
          provide: AUTHORIZED_CALLER_TOKEN,
          useValue: Symbol('AuthorizedCallerToken'),
        },
      ],
    }).compile();

    service = module.get<DWNService>(DWNService);
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize Web5 and log the DID', async () => {
      await service.onModuleInit();

      expect(Web5.connect).toHaveBeenCalledWith({ sync: '30s' });
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'web5 agent has been intialized and connected to local dwn server',
      );
      expect(loggerDebugSpy).toHaveBeenCalledWith('DID author of records:');
      expect(loggerDebugSpy).toHaveBeenCalledWith('test-did');
    });

    it('should log an error if initialization fails', async () => {
      const error = new Error('Initialization failed');
      (Web5.connect as jest.Mock).mockRejectedValue(error);

      await service.onModuleInit();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'An error occurred while initializing dwn agent',
        error,
      );
    });
  });
});
