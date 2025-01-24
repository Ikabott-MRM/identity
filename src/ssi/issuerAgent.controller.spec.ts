import { Test, TestingModule } from '@nestjs/testing';
import { IssuerAgentController } from './issuerAgent.controller';
import { IssuerAgentService } from './issuerAgent.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { IssueCredentialDto } from './dto/CredentialsIssuance.dto';
import { RequestError } from '../helpers/errors';
import {
  mapDataWithRules,
  sendErrorResponse,
  sendResponse,
} from '../helpers/functions';
import { BearerDid } from '@web5/dids';
import { Jwk, LocalKeyManager } from '@web5/crypto';
import { VerifiableCredential } from '@web5/credentials';
import { CredentialsSchemasInMemoryRepository } from './inMemoryRepositories/credentialsSchemas-in-memory';
import { PersistenceService } from './persistence/persistence.service';
import { EmailService } from './persistence/email/email.service';
import { MailerService } from '@nestjs-modules/mailer';

describe('IssuerAgentController', () => {
  let controller: IssuerAgentController;
  let service: IssuerAgentService;
  let configService: ConfigService;
  let testDid: BearerDid;
  let operationalDID: BearerDid;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IssuerAgentController],
      providers: [
        EmailService,
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
        PersistenceService,
        IssuerAgentService,
        ConfigService,
        CredentialsSchemasInMemoryRepository,
        {
          provide: Logger,
          useValue: {
            debug: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

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

    testDid = {
      keyManager: new LocalKeyManager(),
      export: jest.fn().mockResolvedValue({
        uri: 'did:dht:testDid',
      }),
      uri: 'did:dht:testDid',
      document: undefined,
      metadata: undefined,
      getSigner: jest.fn(),
    };

    controller = module.get<IssuerAgentController>(IssuerAgentController);
    service = module.get<IssuerAgentService>(IssuerAgentService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createDID', () => {
    it('should create and export a DID successfully', async () => {
      jest.spyOn(configService, 'get').mockReturnValue('TBD');
      jest
        .spyOn(service, 'createAndExportTBDIdentity')
        .mockResolvedValue({ success: true, result: testDid, error: null });

      const result = await controller.createDID();

      expect(result).toEqual(
        sendResponse(testDid, 201, 'DID successfully created.'),
      );
      expect(service.createAndExportTBDIdentity).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(configService, 'get').mockReturnValue('TBD');
      jest
        .spyOn(service, 'createAndExportTBDIdentity')
        .mockResolvedValue({ success: false, result: null, error: 'error' });

      const result = await controller.createDID();

      expect(result).toEqual(
        sendErrorResponse(RequestError.UNEXPECTED_ERROR, 500, 'error'),
      );
      expect(service.createAndExportTBDIdentity).toHaveBeenCalled();
    });
  });

  describe('issueCredential', () => {
    it('should issue a credential successfully', async () => {
      const issueCredentialDto: IssueCredentialDto = {
        data: {
          name: 'Romina',
          lastname: 'Sal',
        },
        schemaId: 'DriversLicense',
        subjectDid: 'did:dht:rominaDid',
        expDate: '2024-12-31',
      };

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

      const mockVc = await VerifiableCredential.create({
        type: mockSchema.type,
        issuer: operationalDID.uri,
        subject: 'test-did',
        data,
        expirationDate: '2028-12-20T00:00:00.000Z',
      });
      const mockedSignedVcJwt = await mockVc.sign({ did: operationalDID });

      jest.spyOn(service, 'issueCredential').mockResolvedValue({
        success: true,
        result: mockedSignedVcJwt,
        error: null,
      });

      const result = await controller.issueCredential(issueCredentialDto);

      expect(result).toEqual(
        sendResponse(mockedSignedVcJwt, 200, 'VC successfully issued.'),
      );
      expect(service.issueCredential).toHaveBeenCalledWith(
        issueCredentialDto.data,
        issueCredentialDto.expDate,
        issueCredentialDto.schemaId,
        issueCredentialDto.subjectDid,
      );
    });

    it('should handle errors gracefully', async () => {
      const issueCredentialDto: IssueCredentialDto = {
        data: { name: 'test' },
        schemaId: 'schemaId',
        subjectDid: 'subjectDid',
        expDate: '2024-12-31',
      };

      jest
        .spyOn(service, 'issueCredential')
        .mockResolvedValue({ success: false, result: null, error: 'error' });

      const result = await controller.issueCredential(issueCredentialDto);

      expect(result).toEqual(
        sendErrorResponse(RequestError.UNEXPECTED_ERROR, 500, 'error'),
      );
      expect(service.issueCredential).toHaveBeenCalledWith(
        issueCredentialDto.data,
        issueCredentialDto.expDate,
        issueCredentialDto.schemaId,
        issueCredentialDto.subjectDid,
      );
    });
  });

  describe('getIssuerPublicJWKey', () => {
    it('should retrieve the issuer public key successfully', async () => {
      const mockPublicKeyJwk: Jwk = {
        crv: 'Ed25519',
        kty: 'OKP',
        x: 'YxJXolp0KB-gOegwUKk1z1rb9I0A9heEgHj1WQdngcM',
        kid: 'oJxm1VJ7g-kwOPYJ-lhgvQt92mFRjZ-8gTGd4O-SoBE',
        alg: 'EdDSA',
      };

      jest.spyOn(service, 'getIssuerPublicJWKey').mockResolvedValue({
        success: true,
        result: mockPublicKeyJwk,
        error: null,
      });

      const result = await controller.getIssuerPublicJWKey();

      expect(result).toEqual(sendResponse(mockPublicKeyJwk, 200, null));
      expect(service.getIssuerPublicJWKey).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      jest
        .spyOn(service, 'getIssuerPublicJWKey')
        .mockResolvedValue({ success: false, result: null, error: 'error' });

      const result = await controller.getIssuerPublicJWKey();

      expect(result).toEqual(
        sendErrorResponse(RequestError.UNEXPECTED_ERROR, 500, 'error'),
      );
      expect(service.getIssuerPublicJWKey).toHaveBeenCalled();
    });
  });
});
