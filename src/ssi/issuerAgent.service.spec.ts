import { Test, TestingModule } from '@nestjs/testing';
import { IssuerAgentService } from './issuerAgent.service';
import { CredentialsSchemasInMemoryRepository } from './inMemoryRepositories/credentialsSchemas-in-memory';
import { BearerDid, BearerDidSigner, DidDht } from '@web5/dids';
import { Jwk, LocalKeyManager } from '@web5/crypto';
import { Logger } from '@nestjs/common';
import { DWNService } from './dwn/dwn.service';
import { VerifiableCredential } from '@web5/credentials';
import { mapDataWithRules } from '../helpers/functions';
import { EncryptionService } from './persistence/encryption.service';
import { EmailService } from './persistence/email/email.service';
import { MailerService } from '@nestjs-modules/mailer';
import * as fs from 'fs';
import * as crypto from 'crypto';

describe('IssuerAgentService', () => {
  let loggerErrorSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;
  let service: IssuerAgentService;
  let operationalDID: BearerDid;
  let encryptionService: EncryptionService;
  let emailService: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialsSchemasInMemoryRepository,
        DWNService,
        EmailService,
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
        EncryptionService,
        IssuerAgentService,
      ],
    }).compile();

    service = module.get<IssuerAgentService>(IssuerAgentService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
    emailService = module.get<EmailService>(EmailService);

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

    (service as any).operationalDID = operationalDID;
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug');
  });

  afterEach(async () => {
    loggerErrorSpy.mockClear();
    loggerDebugSpy.mockClear();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize issuerAgent service by creating and encrypting a new DID', async () => {
      (service as any).operationalDID = null;

      //mock the result of crecreateAndExportTBDIdentity in order to be able to test how createDidFile is called
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

      jest.spyOn(DidDht, 'create').mockResolvedValueOnce(mockBearerDid);

      const mockPortableDid = await mockBearerDid.export();

      jest
        .spyOn(encryptionService as any, 'promptForUserInput')
        .mockImplementationOnce(async () => 'strongpassword') // for password
        .mockImplementationOnce(async () => 'user@example.com'); // for email

      // Mock email validation to return true in order to have encriptionKey defined
      jest.spyOn(emailService, 'isValidEmailAddress').mockReturnValueOnce(true);

      //mock loadDidFile result in order to trigger the creation of a new did
      jest.spyOn(encryptionService, 'loadDidFile').mockReturnValueOnce(null);
      jest.spyOn(encryptionService, 'createDidFile');

      await service.onModuleInit();

      expect(encryptionService.loadDidFile).toHaveBeenCalled();
      expect(encryptionService.createDidFile).toHaveBeenCalledWith(
        JSON.stringify(mockPortableDid, null, 2),
      );

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'Verifying if there is an encrypted DID to attempt recovery of the previous issuer.',
      );
    });

    it('should initialize issuerAgent service by loading the encrypted DID', async () => {
      (service as any).operationalDID = null;

      //mock the result of crecreateAndExportTBDIdentity in order to be able to test how createDidFile is called
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

      const mockPortableDid = await mockBearerDid.export();

      const mockFileContent = {
        iv: '416a3bf2ece77f548464d0c3eb53974d',
        encryptedData:
          '24709c8637ed0b54d2b2464a476fbf9df5e3acd64521820e5d351441608f0ab8',
      };

      jest.spyOn(DidDht, 'import').mockResolvedValueOnce(mockBearerDid);

      jest
        .spyOn(encryptionService as any, 'promptForUserInput')
        .mockImplementationOnce(async () => 'strongpassword') // for password
        .mockImplementationOnce(async () => 'user@example.com'); // for email

      // Mock email validation to return true in order to have encriptionKey defined
      jest.spyOn(emailService, 'isValidEmailAddress').mockReturnValueOnce(true);

      //mock that did file exists and that user confirms recovery
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest
        .spyOn(encryptionService as any, 'confirmIssuerRecovery')
        .mockResolvedValue(true);

      jest
        .spyOn(fs, 'readFileSync')
        .mockReturnValue(JSON.stringify(mockFileContent));

      jest.spyOn(crypto, 'createDecipheriv').mockReturnValue({
        update: jest.fn().mockReturnValue(JSON.stringify(mockPortableDid)),
        final: jest.fn().mockReturnValue(''),
      } as any);

      //mock loadDidFile result in order to trigger the creation of a new did
      jest.spyOn(encryptionService, 'loadDidFile');
      jest.spyOn(encryptionService, 'createDidFile');

      await service.onModuleInit();

      expect(encryptionService.loadDidFile).toHaveBeenCalled();
      expect(encryptionService.createDidFile).not.toHaveBeenCalled();

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'Verifying if there is an encrypted DID to attempt recovery of the previous issuer.',
      );

      expect(loggerDebugSpy).toHaveBeenCalledWith('operational DID of agent:');

      expect(loggerDebugSpy).toHaveBeenCalledWith(`${mockBearerDid.uri}`);
    });

    it('should fail initializing issuerAgent service due to loadDidFile throwing an error', async () => {
      (service as any).operationalDID = null;

      jest
        .spyOn(encryptionService, 'loadDidFile')
        .mockRejectedValueOnce(new Error('Simulated error'));
      await expect(service.onModuleInit()).rejects.toThrow('Simulated error');

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'Verifying if there is an encrypted DID to attempt recovery of the previous issuer.',
      );

      expect(loggerErrorSpy).toHaveBeenNthCalledWith(
        1,
        `An error occurred while trying to initialize issuerAgent service`,
        expect.any(String),
      );
    });
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

  describe('issueCredential', () => {
    it('should issue a credential successfully and save it to DWN', async () => {
      const mockSchema = {
        id: 'DriversLicense',
        type: ['https://identity-iovf.xyz/schemas/driversLicense'],
        contexts: ['https://www.w3.org/2018/credentials/v1'],
        mappingRulesDescriptor: {
          firstname: 'name',
          lastname: 'lastname',
        },
      };

      const data = mapDataWithRules(
        {
          name: 'Romina',
          lastname: 'Sal',
        },
        mockSchema.mappingRulesDescriptor,
      );
      const mockSaveResult = { success: true };

      jest
        .spyOn((service as any).credentialsRepository, 'get')
        .mockImplementation((schemaId: string) => {
          expect(schemaId).toBeDefined();
          return Promise.resolve(mockSchema);
        });

      const mockVc = await VerifiableCredential.create({
        type: mockSchema.type,
        issuer: operationalDID.uri,
        subject: 'test-did',
        data,
        expirationDate: '2028-12-20T00:00:00.000Z',
      });
      const mockedSignedVcJwt = await mockVc.sign({ did: operationalDID });

      jest.spyOn(VerifiableCredential, 'create').mockResolvedValue(mockVc);
      jest.spyOn(mockVc, 'sign').mockResolvedValue(mockedSignedVcJwt);

      jest
        .spyOn((service as any).dwnService, 'saveCredentialtoDWN')
        .mockResolvedValue(mockSaveResult);

      const result = await service.issueCredential(
        {
          name: 'Romina',
          lastname: 'Sal',
        },
        '2028-12-20',
        'DriversLicense',
        'test-did',
      );

      expect(result.success).toBe(true);
      expect(result.result).toEqual(mockedSignedVcJwt);
      expect(result.error).toBeNull();
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'credential is being created',
      );
      expect(loggerDebugSpy).toHaveBeenCalledWith('credential is being signed');
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'credential has been successfully signed',
      );
    });

    it('should fail while saving it to DWN', async () => {
      const mockSchema = {
        id: 'DriversLicense',
        type: ['https://identity-iovf.xyz/schemas/driversLicense'],
        contexts: ['https://www.w3.org/2018/credentials/v1'],
        mappingRulesDescriptor: {
          firstname: 'name',
          lastname: 'lastname',
        },
      };

      const data = mapDataWithRules(
        {
          name: 'Soledad',
          lastname: 'Canepa',
        },
        mockSchema.mappingRulesDescriptor,
      );
      const mockSaveResult = { success: true };

      jest
        .spyOn((service as any).credentialsRepository, 'get')
        .mockImplementation((schemaId: string) => {
          expect(schemaId).toBeDefined();
          return Promise.resolve(mockSchema);
        });

      jest
        .spyOn((service as any).dwnService, 'saveCredentialtoDWN')
        .mockRejectedValue(new Error('failed to save to DWN'));

      const result = await service.issueCredential(
        {
          name: 'Soledad',
          lastname: 'Canepa',
        },
        '2028-12-20',
        'DriversLicense',
        'test-did',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('failed to save to DWN');
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'credential is being created',
      );
      expect(loggerDebugSpy).toHaveBeenCalledWith('credential is being signed');
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'credential has been successfully signed',
      );
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Failed to issue credential');

      jest
        .spyOn((service as any).credentialsRepository, 'get')
        .mockRejectedValue(mockError);

      const result = await service.issueCredential(
        { key: 'value' },
        '2024-12-31T23:59:59.000Z',
        'schemaId',
        'did:example:123',
      );

      expect(result.success).toBe(false);
      expect(result.result).toBeNull();
      expect(result.error).toBe('Failed to issue credential');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `An error occurred while trying to issue a Verifiable credential for did:example:123`,
        expect.any(String),
      );
    });
  });

  describe('getIssuerPublicJWKey', () => {
    it('should return an error if no verification method is found', async () => {
      operationalDID.document = {
        id: '1',
      };
      const result = await service.getIssuerPublicJWKey();

      expect(result.success).toBe(false);
      expect(result.result).toBeNull();
      expect(result.error).toBe(
        "There is no verification method in the issuer's did document",
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `An error occurred while retrieving the issuer public JSON web key from the verification method in its did document`,
        expect.any(String),
      );
    });

    it('should return the issuer public key successfully', async () => {
      const mockPublicKeyJwk: Jwk = {
        crv: 'Ed25519',
        kty: 'OKP',
        x: 'YxJXolp0KB-gOegwUKk1z1rb9I0A9heEgHj1WQdngcM',
        kid: 'oJxm1VJ7g-kwOPYJ-lhgvQt92mFRjZ-8gTGd4O-SoBE',
        alg: 'EdDSA',
      };

      operationalDID.document = {
        id: '2',
        verificationMethod: [
          {
            publicKeyJwk: mockPublicKeyJwk,
            id: '',
            type: '',
            controller: '',
          },
        ],
      };

      const result = await service.getIssuerPublicJWKey();

      expect(result.success).toBe(true);
      expect(result.result).toEqual(mockPublicKeyJwk);
      expect(result.error).toBeNull();
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should return an error if no public key JWK is found', async () => {
      operationalDID.document = {
        id: '3',
        verificationMethod: [
          {
            publicKeyJwk: null,
            id: '',
            type: '',
            controller: '',
          },
        ],
      };

      const result = await service.getIssuerPublicJWKey();

      expect(result.success).toBe(false);
      expect(result.result).toBeNull();
      expect(result.error).toBe(
        "No JSON Web Key was obtained from the verification method in the issuer's did document",
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `An error occurred while retrieving the issuer public JSON web key from the verification method in its did document`,
        expect.any(String),
      );
    });
  });
});
