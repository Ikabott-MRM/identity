import { Test, TestingModule } from '@nestjs/testing';
import { IssuerAgentService } from './issuerAgent.service';
import { CredentialsSchemasInMemoryRepository } from './inMemoryRepositories/credentialsSchemas-in-memory';
import { BearerDid, BearerDidSigner, DidDht } from '@web5/dids';
import { Jwk, LocalKeyManager } from '@web5/crypto';
import { Logger } from '@nestjs/common';
import { VerifiableCredential } from '@web5/credentials';
import { mapDataWithRules } from '../helpers/functions';
import { PersistenceService } from './persistence/persistence.service';
import { EmailService } from './persistence/email/email.service';
import { MailerService } from '@nestjs-modules/mailer';
import * as crypto from 'crypto';
import { PinataGatewayService } from '../ipfs/pinataGateway.service';
import { DidCidAssociationService } from '../credentialsRegistry/didCidAssociation.service';
import { CredentialsManifestService } from '../credentialsRegistry/credentialsManifest.service';
import { Knex } from 'knex';
import { EncryptionService } from '../encryption/encryption.service';
import { DidSaltAssociationService } from '../credentialsRegistry/didSaltAssociation.service';
import { ConfigService } from '@nestjs/config';

describe('IssuerAgentService', () => {
  let loggerErrorSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;
  let service: IssuerAgentService;
  let operationalDID: BearerDid;
  let persistenceService: PersistenceService;
  let emailService: EmailService;
  let ipfsService: PinataGatewayService;
  let didCidsAssociationService: DidCidAssociationService;
  let credentialManifestService: CredentialsManifestService;
  let knex: Knex;
  let encryptionservice: EncryptionService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialsSchemasInMemoryRepository,
        EmailService,
        PinataGatewayService,
        EncryptionService,
        DidSaltAssociationService,
        DidCidAssociationService,
        ConfigService,
        CredentialsManifestService,
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
        {
          provide: 'KnexConnection',
          useFactory: () => {
            return require('knex')({
              client: 'sqlite3',
              connection: ':memory:',
              useNullAsDefault: true,
            });
          },
        },
        PersistenceService,
        IssuerAgentService,
      ],
    }).compile();

    knex = module.get<Knex>('KnexConnection');

    await knex.schema.createTable('did_cids', table => {
      table.string('cid').primary();
      table.string('didUri').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index('didUri', 'idx_didUri');
    });

    await knex.schema.createTable('manifests', table => {
      table.string('cid').primary();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });

    await knex.schema.createTable('did_salt', table => {
      table.string('didUri').primary();
      table.string('salt').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });

    service = module.get<IssuerAgentService>(IssuerAgentService);
    persistenceService = module.get<PersistenceService>(PersistenceService);
    emailService = module.get<EmailService>(EmailService);
    ipfsService = module.get<PinataGatewayService>(PinataGatewayService);
    encryptionservice = module.get<EncryptionService>(EncryptionService);
    didCidsAssociationService = module.get<DidCidAssociationService>(
      DidCidAssociationService,
    );
    credentialManifestService = module.get<CredentialsManifestService>(
      CredentialsManifestService,
    );

    jest.mock('../helpers/functions', () => ({
      mapDataWithRules: jest.fn(),
    }));
  });

  beforeEach(async () => {
    await knex('did_cids').del();
    await knex('manifests').del();
    await knex('did_salt').del();

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
    await knex('did_cids').del();
  });

  afterEach(async () => {
    if (loggerErrorSpy) {
      loggerErrorSpy.mockRestore();
      loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');
    }
    if (loggerDebugSpy) {
      loggerDebugSpy.mockRestore();
      loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug');
    }
    delete process.env.ISSUER_PORTABLE_DID_CID;
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await knex.destroy();
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
      jest.spyOn(DidDht, 'import').mockResolvedValueOnce(mockBearerDid);

      const mockPortableDid = await mockBearerDid.export();

      jest
        .spyOn(persistenceService as any, 'promptForUserInput')
        .mockImplementationOnce(async () => 'strongpassword') // for password
        .mockImplementationOnce(async () => 'user@example.com'); // for email

      // Mock email validation to return true in order to have encriptionKey defined
      jest.spyOn(emailService, 'isValidEmailAddress').mockReturnValueOnce(true);

      //mock loadDidFile result in order to trigger the creation of a new did
      jest.spyOn(persistenceService, 'loadDidFile').mockReturnValueOnce(null);
      jest.spyOn(persistenceService, 'createDidFile');

      await service.onModuleInit();

      expect(persistenceService.loadDidFile).toHaveBeenCalled();
      expect(persistenceService.createDidFile).toHaveBeenCalledWith(
        JSON.stringify(mockPortableDid, null, 2),
      );

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'Verifying if there is an encrypted DID to attempt recovery of the previous issuer.',
      );
    });

    it('should initialize issuerAgent service by loading the encrypted DID', async () => {
      (service as any).operationalDID = null;

      // Mock the result of crecreateAndExportTBDIdentity in order to be able to test how createDidFile is called
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
        .spyOn(persistenceService as any, 'promptForUserInput')
        .mockImplementationOnce(async () => 'strongpassword') // for password
        .mockImplementationOnce(async () => 'user@example.com'); // for email

      // Mock email validation to return true in order to have encryptionKey defined
      jest.spyOn(emailService, 'isValidEmailAddress').mockReturnValueOnce(true);

      // Simular que el backend detecta ISSUER_PORTABLE_DID_CID como definido
      process.env.ISSUER_PORTABLE_DID_CID = 'mockCID';
      const recoverIssuer = Boolean(process.env.ISSUER_PORTABLE_DID_CID); // Se evalúa como `true`

      // Mock de IPFSService para devolver el contenido encriptado
      jest.spyOn(ipfsService, 'getContent').mockResolvedValue(mockFileContent);

      jest.spyOn(crypto, 'createDecipheriv').mockReturnValue({
        update: jest.fn().mockReturnValue(JSON.stringify(mockPortableDid)),
        final: jest.fn().mockReturnValue(''),
      } as any);

      // Mock loadDidFile result in order to trigger the creation of a new did
      jest
        .spyOn(persistenceService, 'loadDidFile')
        .mockResolvedValue(JSON.stringify(mockPortableDid));

      jest.spyOn(persistenceService, 'createDidFile');

      await service.onModuleInit();

      expect(persistenceService.loadDidFile).toHaveBeenCalled();
      expect(persistenceService.createDidFile).not.toHaveBeenCalled();

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'Verifying if there is an encrypted DID to attempt recovery of the previous issuer.',
      );

      expect(loggerDebugSpy).toHaveBeenCalledWith('operational DID of agent:');

      expect(loggerDebugSpy).toHaveBeenCalledWith(`${mockBearerDid.uri}`);
    });
    it('should fail initializing issuerAgent service due to loadDidFile throwing an error', async () => {
      (service as any).operationalDID = null;

      jest
        .spyOn(persistenceService, 'loadDidFile')
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
    it('should issue a credential successfully and save it to IPFS', async () => {
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

      const mockEncryptedCredential = 'mockEncryptedCredential';
      jest
        .spyOn(persistenceService, 'encryptCredential')
        .mockResolvedValueOnce(mockEncryptedCredential);

      const mockCredentialCID = 'mockCredentialCID';
      jest
        .spyOn(ipfsService, 'uploadContent')
        .mockResolvedValueOnce(mockCredentialCID);

      jest
        .spyOn(didCidsAssociationService, 'addCidToDid')
        .mockResolvedValueOnce(undefined);

      const mockManifest = null; // Simulate no existing manifest
      jest
        .spyOn(credentialManifestService, 'getCurrentManifest')
        .mockResolvedValueOnce(null);

      let manifest = {
        issuerDid: 'did:example:issuer',
        issuedCredentials: [
          { holderDidUri: 'did:example:holder1', cids: ['cid1'] },
        ],
      };
      jest
        .spyOn(credentialManifestService, 'createManifest')
        .mockResolvedValueOnce(manifest);

      jest
        .spyOn(credentialManifestService, 'addManifestToDatabase')
        .mockResolvedValueOnce(undefined);

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
      expect(ipfsService.uploadContent).toHaveBeenCalledWith(
        `${mockVc.vcDataModel.id}-${mockEncryptedCredential}`,
      );
      expect(loggerDebugSpy).toHaveBeenCalledWith('credential is being signed');
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'credential has been successfully signed',
      );
    });

    it('should fail while saving it to IPFS', async () => {
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

      jest
        .spyOn((service as any).credentialsRepository, 'get')
        .mockImplementation((schemaId: string) => {
          expect(schemaId).toBeDefined();
          return Promise.resolve(mockSchema);
        });

      jest
        .spyOn((service as any).ipfsService, 'uploadContent')
        .mockRejectedValue(new Error('failed to save to IPFS'));

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
      expect(result.error).toBe('failed to save to IPFS');
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
