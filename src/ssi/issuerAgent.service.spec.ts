import { Test, TestingModule } from '@nestjs/testing';
import { IssuerAgentService } from './issuerAgent.service';
import { MemoryTempDataService } from './storage/storage.service';
import { CredentialsSchemasInMemoryRepository } from './inMemoryRepositories/credentialsSchemas-in-memory';
import { PresentationsDefinitions } from './inMemoryRepositories/presentations-definitions-in-memory';
import { BearerDid, BearerDidSigner, DidDht } from '@web5/dids';
import { LocalKeyManager } from '@web5/crypto';
import {
  PresentationDefinitionV2,
  PresentationExchange,
  VerifiableCredential,
} from '@web5/credentials';
import { Logger } from '@nestjs/common';
import { DWNService } from './dwn/dwn.service';
import { AUTHORIZED_CALLER_TOKEN } from './dwn/authorized-caller.provider';

describe('IssuerAgentService', () => {
  let loggerErrorSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;
  let service: IssuerAgentService;
  let vcDataModelsStorage: MemoryTempDataService;
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
          useValue: Symbol('AuthorizedCallerToken'), // You can mock the token here
        },
      ],
    }).compile();

    service = module.get<IssuerAgentService>(IssuerAgentService);
    vcDataModelsStorage = new MemoryTempDataService({
      filepath: 'issuer-dataModels-tests-storage.json',
    });
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
    (service as any).vcDataModelsStorage = vcDataModelsStorage;
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

  describe('method for creating a credential offer given a schemaId and Data', () => {
    it('should create a credential offer successfully', async () => {
      const schemaId = 'MockSchema';
      const data = {
        name: 'Forestal',
        startDate: '2024-07-27',
        firstName: 'Romina',
      };

      const mockSchema = {
        id: 'MockSchema',
        type: ['MockCredential'],
        contexts: ['https://www.w3.org/2018/credentials/v1'],
        mappingRulesDescriptor: {
          eventName: 'name',
          eventDate: 'startDate',
          inviteeName: 'firstName',
        },
      };

      const credentialRepo = jest
        .spyOn(service['credentialsRepository'], 'get')
        .mockResolvedValue(mockSchema);

      const expectedCredentiaOffer = {
        type: mockSchema.type,
        data: {
          eventName: data.name,
          eventDate: data.startDate,
          inviteeName: data.firstName,
        },
      };

      const result = await service.createCredentialOffer(schemaId, data);

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.credentialOffer).toBe(
        JSON.stringify(expectedCredentiaOffer),
      );
      expect(result.error).toBeNull();
      credentialRepo.mockClear();
    });

    it('should handle errors gracefully', async () => {
      const schemaId = 'invalidSchemaId';
      const data = {
        name: 'Forestal',
        startDate: '2024-07-27',
        firstName: 'Romina',
      };

      const credentialRepo = jest
        .spyOn(service['credentialsRepository'], 'get')
        .mockRejectedValue(new Error(`Schema with ID ${schemaId} not found`));

      const result = await service.createCredentialOffer(schemaId, data);

      expect(result.success).toBe(false);
      expect(result.result).toBeNull();
      expect(result.error).toBeDefined();
      expect(loggerErrorSpy).toHaveBeenNthCalledWith(
        1,
        `An error occurred while trying to create the credential offer`,
        expect.anything(),
      );
      credentialRepo.mockClear();
    });
  });

  describe('method for issuing a credential given a offerId and subject did', () => {
    it('should issue a verifiable credential successfully', async () => {
      const offerId = 'offerIdMock';
      const subjectDid = 'did:dht:subjectDidMock';
      const credentialOfferData = {
        id: '1',
        type: ['CredentialTypeMock'],
        data: {
          eventName: 'Graduacion',
          eventDate: '30/04/2024',
          inviteeName: 'Romina',
        },
      };
      const verifiableCredentialMock = jest.spyOn(
        VerifiableCredential,
        'create',
      );
      const mockVc = await VerifiableCredential.create({
        type: credentialOfferData.type,
        issuer: operationalDID.uri,
        subject: subjectDid,
        data: credentialOfferData.data,
        expirationDate: null,
      });
      const mockedSignedVcJwt = await mockVc.sign({ did: operationalDID });

      const signMock = jest.fn().mockResolvedValue(mockedSignedVcJwt);
      verifiableCredentialMock.mockResolvedValue({
        sign: signMock,
      } as any);

      const getMock = jest
        .spyOn(vcDataModelsStorage, 'get')
        .mockResolvedValue(credentialOfferData);
      const result = await service.issueCredentialGivenOfferId(
        offerId,
        subjectDid,
      );
      const vc = VerifiableCredential.parseJwt({ vcJwt: result.result });
      //assertions
      expect(getMock).toHaveBeenCalledWith(offerId);
      expect(result.success).toBe(true);
      expect(result.result).not.toBeNull();
      expect(vc).toHaveProperty('issuer', operationalDID.uri);
      expect(vc).toHaveProperty('type', 'CredentialTypeMock');
      expect(result.error).toBeNull();
      verifiableCredentialMock.mockClear();
    });

    it('should handle errors gracefully', async () => {
      const offerId = 'offerIdMock';
      const subjectDid = 'did:dht:subjectDidMock';
      const credentialOfferData = {
        id: '1',
        type: ['CredentialTypeMock'],
        data: {
          eventName: 'Graduacion',
          eventDate: '30/04/2024',
          inviteeName: 'Romina',
        },
      };
      const verifiableCredentialMock = jest.spyOn(
        VerifiableCredential,
        'create',
      );
      const mockVc = await VerifiableCredential.create({
        type: credentialOfferData.type,
        issuer: operationalDID.uri,
        subject: subjectDid,
        data: credentialOfferData.data,
        expirationDate: null,
      });
      const mockedSignedVcJwt = await mockVc.sign({ did: operationalDID });

      const signMock = jest.fn().mockResolvedValue(mockedSignedVcJwt);
      verifiableCredentialMock.mockResolvedValue({
        sign: signMock,
      } as any);

      const getMock = jest
        .spyOn(vcDataModelsStorage, 'get')
        .mockResolvedValue(null);
      const result = await service.issueCredentialGivenOfferId(
        offerId,
        subjectDid,
      );

      //assertions
      expect(getMock).toHaveBeenCalledWith(offerId);
      expect(result.success).toBe(false);
      expect(result.result).toBeNull();
      expect(result.error).toBe(
        `Credential Offer with ID ${offerId} not found`,
      );
      expect(loggerErrorSpy).toHaveBeenNthCalledWith(
        1,
        `An error occurred while trying to issue a Verifiable credential given data associated to id ${offerId}`,
        expect.any(String),
      );
      verifiableCredentialMock.mockClear();
    });
  });

  describe('method for getting a presentation definition given an issuer did  and presentation definition base id', () => {
    it('should retrieve a presentation definition for an attendee credential issued by 12345 event successfully', async () => {
      const issuerdDid = '12345';

      const presentationExchangeMock = jest.spyOn(
        PresentationExchange,
        'validateDefinition',
      );

      presentationExchangeMock.mockReturnValue([
        { tag: 'root', status: 'info', message: 'ok' },
      ]);

      const mockPd = {
        id: 'PD_Attendee',
        name: 'Credentials verification for certifying attendance to event',
        purpose:
          'Confirm the applicant holds an invitation credential for the event of interest',
        input_descriptors: [
          {
            id: 'invitationVerification',
            name: 'Invitation verification',
            purpose: "Verify the applicant's invitation credential",
            constraints: {
              fields: [
                {
                  path: ['$.type[*]'],
                  filter: {
                    type: 'string',
                    pattern: 'InvitationCredential',
                  },
                },
              ],
            },
          },
        ],
      };

      const credentialRepo = jest
        .spyOn(service['presentationsDefinitions'], 'get')
        .mockResolvedValue(mockPd);

      const result = await service.getPresentationDefinition(
        issuerdDid,
        'PD_Attendee',
      );

      const pd = JSON.parse(result.result);
      //assertions
      expect(result.success).toBe(true);
      expect(result.result).not.toBeNull();

      const lastField = pd.input_descriptors[0].constraints.fields.slice(-1)[0];
      expect(lastField.path).toEqual(['$.issuer']);
      expect(lastField.filter.type).toBe('string');
      expect(lastField.filter.pattern).toBe(issuerdDid);

      expect(result.error).toBeNull();
      presentationExchangeMock.mockClear();
      credentialRepo.mockClear();
    });

    it('should handle errors gracefully', async () => {
      const pdId = 'PD_Attendee';
      const issuerdDid = '12345';

      const credentialRepo = jest
        .spyOn(service['presentationsDefinitions'], 'get')
        .mockRejectedValue(new Error(`PD with ID ${pdId} not found`));

      const result = await service.getPresentationDefinition(
        issuerdDid,
        'PD_Attendee',
      );
      //assertions
      expect(credentialRepo).toHaveBeenCalledWith(pdId);
      expect(result.success).toBe(false);
      expect(result.result).toBeNull();
      expect(result.error).toBe(`PD with ID ${pdId} not found`);
      expect(loggerErrorSpy).toHaveBeenNthCalledWith(
        1,
        `An error occurred while trying to retrieve the presentation definition with id ${pdId}`,
        expect.any(String),
      );
    });
  });

  describe('method for evaluating a presentation submission to prove having an invitation to an event whose id was passed as a parameter', () => {
    it('should retrieve true', async () => {
      const presentationExchangeMock = jest.spyOn(
        PresentationExchange,
        'satisfiesPresentationDefinition',
      );

      presentationExchangeMock.mockReturnValue();

      const mockPd = {
        id: 'PD_Attendee',
        name: 'Credentials verification for certifying attendance to event',
        purpose:
          'Confirm the applicant holds an invitation credential for the event of interest',
        input_descriptors: [
          {
            id: 'invitationVerification',
            name: 'Invitation verification',
            purpose: "Verify the applicant's invitation credential",
            constraints: {
              fields: [
                {
                  path: ['$.type[*]'],
                  filter: {
                    type: 'string',
                    pattern: 'InvitationCredential',
                  },
                },
              ],
            },
          },
        ],
      };

      const credentialRepo = jest
        .spyOn(service['presentationsDefinitions'], 'get')
        .mockResolvedValue(mockPd);

      const result = await service.evaluatesPresentationSubmission(
        'mockVerifiablePresentation0',
        undefined,
        'PD_Attendee',
      );

      //assertions
      expect(credentialRepo).toHaveBeenCalledWith('PD_Attendee');
      expect(result.result).not.toBeNull();
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      presentationExchangeMock.mockClear();
      credentialRepo.mockClear();
    });

    it('should retrieve false and error as no presentation definition was found', async () => {
      const pdId = 'PD_Attendee';

      jest
        .spyOn(service, 'getPresentationDefinition')
        .mockRejectedValue(new Error(`PD with ID ${pdId} not found`));

      const result = await service.evaluatesPresentationSubmission(
        'mockVerifiablePresentation',
        undefined,
        pdId,
      );

      //assertions
      expect(result.success).toBe(false);
      expect(result.result).toBe(false);
      expect(result.error).toBe(`PD with ID ${pdId} not found`);
      expect(loggerErrorSpy).toHaveBeenNthCalledWith(
        1,
        `An error occurred while validating the submitted presentation`,
        expect.any(String),
      );
    });

    it('should retrieve false and error as verifiable presentation submitted did not satisfied the PD', async () => {
      const pdId = 'PD_Attendee';

      const presentationExchangeMock = jest.spyOn(
        PresentationExchange,
        'satisfiesPresentationDefinition',
      );

      presentationExchangeMock.mockImplementation(
        ({
          vcJwts,
          presentationDefinition,
        }: {
          vcJwts: string[];
          presentationDefinition: PresentationDefinitionV2;
        }) => {
          throw new Error('Verifiable presentation failed to satisfy PD');
        },
      );

      const mockPd = {
        id: 'PD_Attendee',
        name: 'Credentials verification for certifying attendance to event',
        purpose:
          'Confirm the applicant holds an invitation credential for the event of interest',
        input_descriptors: [
          {
            id: 'invitationVerification',
            name: 'Invitation verification',
            purpose: "Verify the applicant's invitation credential",
            constraints: {
              fields: [
                {
                  path: ['$.type[*]'],
                  filter: {
                    type: 'string',
                    pattern: 'InvitationCredential',
                  },
                },
              ],
            },
          },
        ],
      };

      const credentialRepo = jest
        .spyOn(service['presentationsDefinitions'], 'get')
        .mockResolvedValue(mockPd);

      const result = await service.evaluatesPresentationSubmission(
        'mockVerifiablePresentation0',
        undefined,
        pdId,
      );

      //assertions
      expect(credentialRepo).toHaveBeenCalledWith(pdId);
      expect(result.success).toBe(false);
      expect(result.result).toBe(false);
      expect(result.error).toBe(`Verifiable presentation failed to satisfy PD`);
      expect(loggerErrorSpy).toHaveBeenNthCalledWith(
        1,
        `An error occurred while validating the submitted presentation`,
        expect.any(String),
      );
    });
  });
});
