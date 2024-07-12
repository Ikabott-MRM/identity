import { Test, TestingModule } from '@nestjs/testing';
import { IssuerAgentService } from './issuerAgent.service';
import { CredentialsSchemasInMemoryRepository } from './inMemoryRepositories/credentialsSchemas-in-memory';
import { PresentationsDefinitions } from './inMemoryRepositories/presentations-definitions-in-memory';
import { BearerDid, BearerDidSigner, DidDht } from '@web5/dids';
import { LocalKeyManager } from '@web5/crypto';
import { Logger } from '@nestjs/common';
import { DWNService } from './dwn/dwn.service';
import { AUTHORIZED_CALLER_TOKEN } from './dwn/authorized-caller.provider';

describe('IssuerAgentService', () => {
  let loggerErrorSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;
  let service: IssuerAgentService;
  let operationalDID: BearerDid;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssuerAgentService,
        CredentialsSchemasInMemoryRepository,
        PresentationsDefinitions,
        DWNService,
        {
          provide: AUTHORIZED_CALLER_TOKEN,
          useValue: Symbol('AuthorizedCallerToken'),
        },
      ],
    }).compile();

    service = module.get<IssuerAgentService>(IssuerAgentService);
    jest.mock('../helpers/functions', () => ({
      mapDataWithRules: jest.fn(),
    }));

    const signerMock = {
      algorithm: 'mockAlgorithm',
      keyId: 'mockKeyId',
      sign: jest.fn().mockResolvedValue(new Uint8Array()),
      verify: jest.fn().mockResolvedValue(true),
    };

    operationalDID = {
      keyManager: new LocalKeyManager(),
      export: jest.fn().mockResolvedValue({
        uri: 'did:dht:operationalDid',
      }),
      uri: 'did:dht:operationalDid',
      document: undefined,
      metadata: undefined,
      getSigner: jest.fn().mockResolvedValue(signerMock),
    };

    // Set the operationalDID directly (using type assertion)
    (service as any).operationalDID = operationalDID;
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug');
  });

  afterEach(async () => {
    loggerErrorSpy.mockClear();
    loggerDebugSpy.mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('method for creating and exporting a TBD Identity', () => {
    it('should create and export a DID successfully', async () => {
      const mockBearerDid: BearerDid = {
        keyManager: new LocalKeyManager(),
        export: jest.fn().mockResolvedValue({
          uri: 'did:dht:mockDid',
        }),
        uri: 'did:dht:mockDid',
        document: undefined,
        metadata: undefined,
        getSigner: function (params?: {
          methodId: string;
        }): Promise<BearerDidSigner> {
          throw new Error('Function not implemented.');
        },
      };

      const mockDidDhtCreate = jest
        .spyOn(DidDht, 'create')
        .mockResolvedValue(mockBearerDid);

      const result = await service.createAndExportTBDIdentity();

      expect(mockDidDhtCreate).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.error).toBeNull();

      mockDidDhtCreate.mockClear();
    });

    it('should handle errors gracefully', async () => {
      const mockDidDhtCreate = jest
        .spyOn(DidDht, 'create')
        .mockRejectedValue(new Error('Failed to create DID'));

      const result = await service.createAndExportTBDIdentity();

      expect(mockDidDhtCreate).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.result).toBeNull();
      expect(result.error).toBe('Failed to create DID');
      expect(loggerErrorSpy).toHaveBeenNthCalledWith(
        1,
        `An error occurred while trying to create a DID`,
        expect.any(String),
      );
      mockDidDhtCreate.mockClear();
    });
  });

});
