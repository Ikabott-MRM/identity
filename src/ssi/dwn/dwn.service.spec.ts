import { Test, TestingModule } from '@nestjs/testing';
import { AUTHORIZED_CALLER_TOKEN } from './authorized-caller.provider';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import { DWNService } from './dwn.service';
import { Web5 } from '@web5/api';
import { LocalKeyManager } from '@web5/crypto';
import { Record, RecordsQueryResponse } from '@web5/api';
import { VerifiableCredential } from '@web5/credentials';

jest.mock('@web5/dids', () => {
  return {
    BearerDid: jest.fn(),
  };
});
jest.mock('@web5/credentials', () => {
  return {
    VerifiableCredential: {
      parseJwt: jest.fn(),
    },
  };
});

jest.mock('@web5/crypto', () => {
  return {
    LocalKeyManager: jest.fn(),
  };
});


jest.mock('@web5/api', () => {
  return {
    Web5: {
      connect: jest.fn(),
    },
    Record: jest.fn(),
    RecordsQueryResponse: jest.fn(),
  };
});jest.mock('fs');

describe('DWNService', () => {
  let web5Mock = Web5 as jest.Mocked<typeof Web5>;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;

  let service: DWNService;

  const signerMock = {
    algorithm: 'mockAlgorithm',
    keyId: 'mockKeyId',
    sign: jest.fn().mockResolvedValue(new Uint8Array()),
    verify: jest.fn().mockResolvedValue(true),
  };
  
  class MockWeb5 {
    agent = {
      agentDid:{
        keyManager: new LocalKeyManager(),
        export: jest.fn().mockResolvedValue({
          uri: 'did:dht:web5Agent',
        }),
        uri: 'did:dht:web5Agent',
        document: undefined,
        metadata: undefined,
        getSigner: jest.fn().mockResolvedValue(signerMock),
      }
    };
    dwn = {
      protocols: {
        query: jest.fn(),
        configure: jest.fn(),
      },
      records: {
        create: jest.fn(),
        query: jest.fn(),
      }
    };
  }

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
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log');
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

  describe('importAndConfigureProtocol', () => {
    it('should log an error if reading the JSON file fails', async () => {
      const error = new Error('File read error');
      (fs.readFileSync as jest.Mock).mockImplementation(() => { throw error });

      await service.importAndConfigureProtocol();

      expect(loggerErrorSpy).toHaveBeenCalledWith('Error loading JSON file:', error);
    });

    it('should log if the protocol already exists', async () => {
      const protocolData = { protocol: 'https://identity-iovf.xyz' };
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(protocolData));
      const mockWeb5Instance = new MockWeb5();
      (service as any).web5Instance = mockWeb5Instance;

      mockWeb5Instance.dwn.protocols.query.mockResolvedValue({
        protocols: [protocolData],
        status: { code: 200 },
      });

      await service.importAndConfigureProtocol();

      expect(mockWeb5Instance.dwn.protocols.query).toHaveBeenCalledWith({
        message: {
          filter: {
            protocol: 'https://identity-iovf.xyz',
          },
        },
      });

      expect(loggerLogSpy).toHaveBeenCalledWith('Protocol already exists');
    });

    it('should configure the protocol if it does not exist', async () => {
      const protocolData = { protocol: 'https://identity-iovf.xyz' };
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(protocolData));
      const mockWeb5Instance = new MockWeb5();
      (service as any).web5Instance = mockWeb5Instance;

      mockWeb5Instance.dwn.protocols.query.mockResolvedValue({
        protocols: [],
        status: { code: 200 },
      });

      const configureResponse = {
        status: { code: 200 },
        protocol: protocolData,
      };

      mockWeb5Instance.dwn.protocols.configure.mockResolvedValue(configureResponse);

      await service.importAndConfigureProtocol();

      expect(mockWeb5Instance.dwn.protocols.query).toHaveBeenCalledWith({
        message: {
          filter: {
            protocol: 'https://identity-iovf.xyz',
          },
        },
      });

      expect(mockWeb5Instance.dwn.protocols.configure).toHaveBeenCalledWith({
        message: {
          definition: protocolData,
        },
      });

      expect(loggerLogSpy).toHaveBeenCalledWith('Protocol configured', configureResponse.status, configureResponse.protocol);
    });

    it('should log an error if querying protocols fails', async () => {
      const protocolData = { protocol: 'https://identity-iovf.xyz' };
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(protocolData));
      const mockWeb5Instance = new MockWeb5();
      (service as any).web5Instance = mockWeb5Instance;

      const queryError = { code: 500, message: 'Internal Server Error' };
      mockWeb5Instance.dwn.protocols.query.mockResolvedValue({
        protocols: [],
        status: queryError,
      });

      await service.importAndConfigureProtocol();

      expect(mockWeb5Instance.dwn.protocols.query).toHaveBeenCalledWith({
        message: {
          filter: {
            protocol: 'https://identity-iovf.xyz',
          },
        },
      });

      expect(loggerErrorSpy).toHaveBeenCalledWith('Error querying protocols', queryError);
    });
  });

  describe('getDWNAgentDid', () => {
    it('should return the agent DID if the callerToken is authorized', async () => {
      (service as any).web5Instance = new MockWeb5();

      const authorizedCallerToken = AUTHORIZED_CALLER_TOKEN;
      (service as any).authorizedCallerToken = authorizedCallerToken;

      const result = await service.getDWNAgentDid(authorizedCallerToken);

      expect(result).toBe((service as any).web5Instance.agent.agentDid);
    });

    it('should throw an error if the callerToken is unauthorized', async () => {
      (service as any).web5Instance = new MockWeb5();

      const unauthorizedCallerToken = Symbol('UnauthorizedCallerToken');
      (service as any).authorizedCallerToken = AUTHORIZED_CALLER_TOKEN;

      await expect(service.getDWNAgentDid(unauthorizedCallerToken)).rejects.toThrow('Unauthorized access. Cannot access to dwn agent did');
    });
  });

  describe('saveCredentialtoDWN', () => {
    it('should throw an error if holderDid is undefined', async () => {
      const result = await service.saveCredentialtoDWN(undefined, 'signedVc', 'credentialSchema');

      expect(result.success).toBe(false);
      expect(result.result).toBeNull();
      expect(result.error).toBe('holderDid cannot be undefined.');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `An error occurred while trying to save credential for holder undefined to DWN node`,
        expect.any(Error),
      );
    });

    it('should throw an error if signedVc is undefined', async () => {
      const result = await service.saveCredentialtoDWN('holderDid', undefined, 'credentialSchema');

        expect(result.success).toBe(false);
        expect(result.result).toBeNull();
        expect(result.error).toBe('signedVc cannot be undefined.');
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          `An error occurred while trying to save credential for holder holderDid to DWN node`,
          expect.any(Error),
        );
    });

    it('should throw an error if credentialSchema is undefined', async () => {
     const result =  await service.saveCredentialtoDWN('holderDid', 'signedVc', undefined);
      
        expect(result.success).toBe(false);
        expect(result.result).toBeNull();
        expect(result.error).toBe('credentialSchema cannot be undefined.');
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          `An error occurred while trying to save credential for holder holderDid to DWN node`,
          expect.any(Error),
        );
        
    });

    it('should return success if credential is saved successfully', async () => {
      const mockWeb5Instance = new MockWeb5();
      (service as any).web5Instance = mockWeb5Instance;

      const res = {
        status: { code: 202, detail: 'Accepted' },
        record: { id: 'record-id' },
      };

      mockWeb5Instance.dwn.records.create.mockResolvedValue(res);

      const result = await service.saveCredentialtoDWN('holderDid', 'signedVc', 'credentialSchema');

      expect(result).toEqual({ success: true, result: res.record, error: null });
      expect(loggerDebugSpy).toHaveBeenCalledWith('Credential has been successfully written to DWN node');
    });

    it('should return failure if credential is not saved successfully', async () => {
      const mockWeb5Instance = new MockWeb5();
      (service as any).web5Instance = mockWeb5Instance;

      const res = {
        status: { code: 400, detail: 'Bad Request' },
        record: null,
      };

      mockWeb5Instance.dwn.records.create.mockResolvedValue(res);

      const result = await service.saveCredentialtoDWN('holderDid', 'signedVc', 'credentialSchema');

      expect(result).toEqual({ success: false, result: null, error: res.status.detail });
      expect(loggerDebugSpy).toHaveBeenCalledWith('Credential has not been written to DWN node. Detail: Bad Request');
    });

    it('should log an error and return failure if an exception occurs', async () => {
      const mockWeb5Instance = new MockWeb5();
      (service as any).web5Instance = mockWeb5Instance;

      const error = new Error('Test error');
      mockWeb5Instance.dwn.records.create.mockRejectedValue(error);

      const result = await service.saveCredentialtoDWN('holderDid', 'signedVc', 'credentialSchema');

      expect(result).toEqual({ success: false, result: null, error: error.message });
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'An error occurred while trying to save credential for holder holderDid to DWN node',
        error,
      );
    });
  });

  describe('fetchAndParseCredentials', () => {
    it('should fetch and parse credentials correctly', async () => {
      const mockRecord = {
        data: {
          text: jest.fn().mockResolvedValue('encodedJwtCredential'),
        },
      } as unknown as Record;

      const mockRecordsQueryResponse = {
        records: [mockRecord],
      } as RecordsQueryResponse;

      const parsedCredential = { credential: 'parsedCredential' };
      (VerifiableCredential.parseJwt as jest.Mock).mockReturnValue(parsedCredential);

      const result = await service.fetchAndParseCredentials(mockRecordsQueryResponse);

      expect(mockRecord.data.text).toHaveBeenCalled();
      expect(VerifiableCredential.parseJwt).toHaveBeenCalledWith({ vcJwt: 'encodedJwtCredential' });
      expect(result).toEqual([
        {
          vcJwt: 'encodedJwtCredential',
          verifiableCredential: parsedCredential,
        },
      ]);
    });

    it('should handle errors during parsing', async () => {
      const mockRecord = {
        data: {
          text: jest.fn().mockResolvedValue('encodedJwtCredential'),
        },
      } as unknown as Record;

      const mockRecordsQueryResponse = {
        records: [mockRecord],
      } as RecordsQueryResponse;

      const error = new Error('Parse error');
      (VerifiableCredential.parseJwt as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(service.fetchAndParseCredentials(mockRecordsQueryResponse)).rejects.toThrow(error);

      expect(mockRecord.data.text).toHaveBeenCalled();
      expect(VerifiableCredential.parseJwt).toHaveBeenCalledWith({ vcJwt: 'encodedJwtCredential' });
    });
  });

  describe('queryCredentialsFromDWN', () => {
    let mockWeb5Instance: MockWeb5;
  
    beforeEach(() => {
      mockWeb5Instance = new MockWeb5();
      (service as any).web5Instance = mockWeb5Instance;
    });
  
    it('should throw an error if holderDid is undefined', async () => {
      const result = await service.queryCredentialsFromDWN(undefined);
  
      expect(result.success).toBe(false);
      expect(result.result).toBeNull();
      expect(result.error).toBe('holderDid cannot be undefined.');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'An error occurred while trying to query credentials of holder undefined from DWN node',
        new Error('holderDid cannot be undefined.'),
      );
    });
  
    it('should successfully retrieve credentials', async () => {
      const mockRecordsQueryResponse = {
        status: { code: 200 },
        records: [
          {
            data: {
              text: jest.fn().mockResolvedValue('mockedRecord'),
            },
          },
        ],
      } as unknown as RecordsQueryResponse;
  
      mockWeb5Instance.dwn.records.query.mockResolvedValue(mockRecordsQueryResponse);
  
      const parsedCredential = { credential: 'parsedCredential' };
      (VerifiableCredential.parseJwt as jest.Mock).mockReturnValue(parsedCredential);
  
      const result = await service.queryCredentialsFromDWN('holderDid');
  
      expect(mockWeb5Instance.dwn.records.query).toHaveBeenCalledWith({
        message: {
          filter: {
            protocol: 'https://identity-iovf.xyz',
            recipient: 'holderDid',
          },
        },
      });
  
      expect(result).toEqual({
        success: true,
        result: [
          {
            vcJwt: 'mockedRecord',
            verifiableCredential: parsedCredential,
          },
        ],
        error: null,
      });
  
      expect(loggerLogSpy).toHaveBeenCalledWith(
        'credentials with holder holderDid have been successfully retrieved ',
      );
    });
  
    it('should handle DWN node errors', async () => {
      const mockErrorResponse = {
        status: { code: 400, detail: 'Bad Request' },
        records: [],
      } as unknown as RecordsQueryResponse;
  
      mockWeb5Instance.dwn.records.query.mockResolvedValue(mockErrorResponse);
  
      const result = await service.queryCredentialsFromDWN('holderDid');
  
      expect(mockWeb5Instance.dwn.records.query).toHaveBeenCalledWith({
        message: {
          filter: {
            protocol: 'https://identity-iovf.xyz',
            recipient: 'holderDid',
          },
        },
      });
  
      expect(result).toEqual({
        success: false,
        result: null,
        error: 'Bad Request',
      });
  
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'An error occurred while trying to query credentials of holder holderDid from DWN node',
        'Bad Request',
      );
    });
  
    it('should handle exceptions during the process', async () => {
      const error = new Error('Test error');
      mockWeb5Instance.dwn.records.query.mockRejectedValue(error);
  
      const result = await service.queryCredentialsFromDWN('holderDid');
  
      expect(mockWeb5Instance.dwn.records.query).toHaveBeenCalledWith({
        message: {
          filter: {
            protocol: 'https://identity-iovf.xyz',
            recipient: 'holderDid',
          },
        },
      });
  
      expect(result).toEqual({
        success: false,
        result: null,
        error: 'Test error',
      });
  
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'An error occurred while trying to query credentials of holder holderDid from DWN node',
        error,
      );
    });
  });

});
