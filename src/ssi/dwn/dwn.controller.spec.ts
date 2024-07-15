import { Test, TestingModule } from '@nestjs/testing';
import { DWNController } from './dwn.controller';
import { DWNService } from './dwn.service';
import { BadRequestException, Logger } from '@nestjs/common';
import { RequestError } from '../../helpers/errors';
import { sendErrorResponse, sendResponse } from '../../helpers/functions';

jest.mock('../../helpers/functions', () => ({
  sendErrorResponse: jest.fn(),
  sendResponse: jest.fn(),
}));

describe('DWNController', () => {
  let controller: DWNController;
  let service: DWNService;
  let loggerDebugSpy: jest.SpyInstance;

  const mockDWNService = {
    queryCredentialsFromDWN: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DWNController],
      providers: [
        {
          provide: DWNService,
          useValue: mockDWNService,
        },
      ],
    }).compile();

    controller = module.get<DWNController>(DWNController);
    service = module.get<DWNService>(DWNService);
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('credentials', () => {
    it('should return error if holderDid is not provided', async () => {
      await expect(controller.credentials(undefined)).rejects.toThrow(new BadRequestException('holderDid cannot be undefined. A value must be passed as query parameter.'));
    });

    it('should return VCs if service call is successful', async () => {
      const mockResult = { success: true, result: [ {
        "vcJwt": "eyJ0eXAiOiJKV1QiLCJhbGciOiJFZERTQSIsImtpZCI6ImRpZDpkaHQ6Y2NqZnhlMTRxb3diOWViMzd5YWZia2ppMzdwcHo3cnB5ZDVieGJyeXhkNGkxYjU4bzhibyMwIn0.eyJ2YyI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSJdLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiaHR0cHM6Ly9pZGVudGl0eS1pb3ZmLnh5ei9zY2hlbWFzL2RyaXZlcnNMaWNlbnNlIl0sImlkIjoidXJuOnV1aWQ6MDkzNmE0YTMtNWI2OS00ZmY1LTgyZTktZmE0YmI1NjMwMDk0IiwiaXNzdWVyIjoiZGlkOmRodDpjY2pmeGUxNHFvd2I5ZWIzN3lhZmJramkzN3BwejdycHlkNWJ4YnJ5eGQ0aTFiNThvOGJvIiwiaXNzdWFuY2VEYXRlIjoiMjAyNC0wNy0xMlQxODoxMDoyNFoiLCJjcmVkZW50aWFsU3ViamVjdCI6eyJpZCI6ImRpZDpkaHQ6emtjZHdxdXB0cDRkZ2duNXByaWpieHg2ZG5paThrbXQ5a3NieGJjeTl4ZmZmbmJtZXRwbyIsImZpcnN0bmFtZSI6IlNvbGVkYWQiLCJsYXN0bmFtZSI6IkNhbmVwYSIsImxpY2Vuc2VDYXRlZ29yeSI6IkQifSwiZXhwaXJhdGlvbkRhdGUiOiIyMDI4LTEyLTIwVDAwOjAwOjAwLjAwMFoifSwibmJmIjoxNzIwODA3ODI0LCJqdGkiOiJ1cm46dXVpZDowOTM2YTRhMy01YjY5LTRmZjUtODJlOS1mYTRiYjU2MzAwOTQiLCJpc3MiOiJkaWQ6ZGh0OmNjamZ4ZTE0cW93YjllYjM3eWFmYmtqaTM3cHB6N3JweWQ1Ynhicnl4ZDRpMWI1OG84Ym8iLCJzdWIiOiJkaWQ6ZGh0OnprY2R3cXVwdHA0ZGdnbjVwcmlqYnh4NmRuaWk4a210OWtzYnhiY3k5eGZmZm5ibWV0cG8iLCJpYXQiOjE3MjA4MDc4MjQsImV4cCI6MTg2MDg4MzIwMH0.qb7zF-qq1JBcIKqFC9Cgf1u-H4tKhRj6rb7bSGRXPGTiv9VAZJPvlIWYwUTtJj0_SCGw6vTc0Jt3eT7v_PEsCw",
        "verifiableCredential": {
            "vcDataModel": {
                "@context": [
                    "https://www.w3.org/2018/credentials/v1"
                ],
                "type": [
                    "VerifiableCredential",
                    "https://identity-iovf.xyz/schemas/driversLicense"
                ],
                "id": "urn:uuid:0936a4a3-5b69-4ff5-82e9-fa4bb5630094",
                "issuer": "did:dht:ccjfxe14qowb9eb37yafbkji37ppz7rpyd5bxbryxd4i1b58o8bo",
                "issuanceDate": "2024-07-12T18:10:24Z",
                "credentialSubject": {
                    "id": "test-did",
                    "firstname": "Romina",
                    "lastname": "Sal",
                    "licenseCategory": "D"
                },
                "expirationDate": "2028-12-20T00:00:00.000Z"
            }
        }
    }], error: null };
      mockDWNService.queryCredentialsFromDWN.mockResolvedValue(mockResult);

      const response = await controller.credentials('test-did');

      expect(service.queryCredentialsFromDWN).toHaveBeenCalledWith('test-did');
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'DWN node successfully queried for VCs of test-did',
      );
      expect(sendResponse).toHaveBeenCalledWith([{
        "vcJwt": "eyJ0eXAiOiJKV1QiLCJhbGciOiJFZERTQSIsImtpZCI6ImRpZDpkaHQ6Y2NqZnhlMTRxb3diOWViMzd5YWZia2ppMzdwcHo3cnB5ZDVieGJyeXhkNGkxYjU4bzhibyMwIn0.eyJ2YyI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSJdLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiaHR0cHM6Ly9pZGVudGl0eS1pb3ZmLnh5ei9zY2hlbWFzL2RyaXZlcnNMaWNlbnNlIl0sImlkIjoidXJuOnV1aWQ6MDkzNmE0YTMtNWI2OS00ZmY1LTgyZTktZmE0YmI1NjMwMDk0IiwiaXNzdWVyIjoiZGlkOmRodDpjY2pmeGUxNHFvd2I5ZWIzN3lhZmJramkzN3BwejdycHlkNWJ4YnJ5eGQ0aTFiNThvOGJvIiwiaXNzdWFuY2VEYXRlIjoiMjAyNC0wNy0xMlQxODoxMDoyNFoiLCJjcmVkZW50aWFsU3ViamVjdCI6eyJpZCI6ImRpZDpkaHQ6emtjZHdxdXB0cDRkZ2duNXByaWpieHg2ZG5paThrbXQ5a3NieGJjeTl4ZmZmbmJtZXRwbyIsImZpcnN0bmFtZSI6IlNvbGVkYWQiLCJsYXN0bmFtZSI6IkNhbmVwYSIsImxpY2Vuc2VDYXRlZ29yeSI6IkQifSwiZXhwaXJhdGlvbkRhdGUiOiIyMDI4LTEyLTIwVDAwOjAwOjAwLjAwMFoifSwibmJmIjoxNzIwODA3ODI0LCJqdGkiOiJ1cm46dXVpZDowOTM2YTRhMy01YjY5LTRmZjUtODJlOS1mYTRiYjU2MzAwOTQiLCJpc3MiOiJkaWQ6ZGh0OmNjamZ4ZTE0cW93YjllYjM3eWFmYmtqaTM3cHB6N3JweWQ1Ynhicnl4ZDRpMWI1OG84Ym8iLCJzdWIiOiJkaWQ6ZGh0OnprY2R3cXVwdHA0ZGdnbjVwcmlqYnh4NmRuaWk4a210OWtzYnhiY3k5eGZmZm5ibWV0cG8iLCJpYXQiOjE3MjA4MDc4MjQsImV4cCI6MTg2MDg4MzIwMH0.qb7zF-qq1JBcIKqFC9Cgf1u-H4tKhRj6rb7bSGRXPGTiv9VAZJPvlIWYwUTtJj0_SCGw6vTc0Jt3eT7v_PEsCw",
        "verifiableCredential": {
            "vcDataModel": {
                "@context": [
                    "https://www.w3.org/2018/credentials/v1"
                ],
                "type": [
                    "VerifiableCredential",
                    "https://identity-iovf.xyz/schemas/driversLicense"
                ],
                "id": "urn:uuid:0936a4a3-5b69-4ff5-82e9-fa4bb5630094",
                "issuer": "did:dht:ccjfxe14qowb9eb37yafbkji37ppz7rpyd5bxbryxd4i1b58o8bo",
                "issuanceDate": "2024-07-12T18:10:24Z",
                "credentialSubject": {
                    "id": "test-did",
                    "firstname": "Romina",
                    "lastname": "Sal",
                    "licenseCategory": "D"
                },
                "expirationDate": "2028-12-20T00:00:00.000Z"
            }
        }
    }], 200, null);
      expect(response).toBe(sendResponse([{
        "vcJwt": "eyJ0eXAiOiJKV1QiLCJhbGciOiJFZERTQSIsImtpZCI6ImRpZDpkaHQ6Y2NqZnhlMTRxb3diOWViMzd5YWZia2ppMzdwcHo3cnB5ZDVieGJyeXhkNGkxYjU4bzhibyMwIn0.eyJ2YyI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSJdLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiaHR0cHM6Ly9pZGVudGl0eS1pb3ZmLnh5ei9zY2hlbWFzL2RyaXZlcnNMaWNlbnNlIl0sImlkIjoidXJuOnV1aWQ6MDkzNmE0YTMtNWI2OS00ZmY1LTgyZTktZmE0YmI1NjMwMDk0IiwiaXNzdWVyIjoiZGlkOmRodDpjY2pmeGUxNHFvd2I5ZWIzN3lhZmJramkzN3BwejdycHlkNWJ4YnJ5eGQ0aTFiNThvOGJvIiwiaXNzdWFuY2VEYXRlIjoiMjAyNC0wNy0xMlQxODoxMDoyNFoiLCJjcmVkZW50aWFsU3ViamVjdCI6eyJpZCI6ImRpZDpkaHQ6emtjZHdxdXB0cDRkZ2duNXByaWpieHg2ZG5paThrbXQ5a3NieGJjeTl4ZmZmbmJtZXRwbyIsImZpcnN0bmFtZSI6IlNvbGVkYWQiLCJsYXN0bmFtZSI6IkNhbmVwYSIsImxpY2Vuc2VDYXRlZ29yeSI6IkQifSwiZXhwaXJhdGlvbkRhdGUiOiIyMDI4LTEyLTIwVDAwOjAwOjAwLjAwMFoifSwibmJmIjoxNzIwODA3ODI0LCJqdGkiOiJ1cm46dXVpZDowOTM2YTRhMy01YjY5LTRmZjUtODJlOS1mYTRiYjU2MzAwOTQiLCJpc3MiOiJkaWQ6ZGh0OmNjamZ4ZTE0cW93YjllYjM3eWFmYmtqaTM3cHB6N3JweWQ1Ynhicnl4ZDRpMWI1OG84Ym8iLCJzdWIiOiJkaWQ6ZGh0OnprY2R3cXVwdHA0ZGdnbjVwcmlqYnh4NmRuaWk4a210OWtzYnhiY3k5eGZmZm5ibWV0cG8iLCJpYXQiOjE3MjA4MDc4MjQsImV4cCI6MTg2MDg4MzIwMH0.qb7zF-qq1JBcIKqFC9Cgf1u-H4tKhRj6rb7bSGRXPGTiv9VAZJPvlIWYwUTtJj0_SCGw6vTc0Jt3eT7v_PEsCw",
        "verifiableCredential": {
            "vcDataModel": {
                "@context": [
                    "https://www.w3.org/2018/credentials/v1"
                ],
                "type": [
                    "VerifiableCredential",
                    "https://identity-iovf.xyz/schemas/driversLicense"
                ],
                "id": "urn:uuid:0936a4a3-5b69-4ff5-82e9-fa4bb5630094",
                "issuer": "did:dht:ccjfxe14qowb9eb37yafbkji37ppz7rpyd5bxbryxd4i1b58o8bo",
                "issuanceDate": "2024-07-12T18:10:24Z",
                "credentialSubject": {
                    "id": "test-did",
                    "firstname": "Romina",
                    "lastname": "Sal",
                    "licenseCategory": "D"
                },
                "expirationDate": "2028-12-20T00:00:00.000Z"
            }
        }
    }],200,null));
    });

    it('should return error if service call fails', async () => {
      const mockResult = { success: false, result: null, error: 'error' };
      mockDWNService.queryCredentialsFromDWN.mockResolvedValue(mockResult);

      const response = await controller.credentials('test-did');

      expect(service.queryCredentialsFromDWN).toHaveBeenCalledWith('test-did');
      expect(sendErrorResponse).toHaveBeenCalledWith(
        RequestError.UNEXPECTED_ERROR,
        500,
        'error',
      );
      expect(response).toBe(sendErrorResponse(
        RequestError.UNEXPECTED_ERROR,
        500,
        'error',
      ));
    });

    it('should handle exceptions correctly', async () => {
      mockDWNService.queryCredentialsFromDWN.mockReturnValue(
       {success:false, result: null, error:'Test error'}
      );

      const response = await controller.credentials('test-did');

      expect(service.queryCredentialsFromDWN).toHaveBeenCalledWith('test-did');
      expect(sendErrorResponse).toHaveBeenCalledWith(
        RequestError.UNEXPECTED_ERROR,
        500,
        'Test error',
      );
      expect(response).toBe(sendErrorResponse(
        RequestError.UNEXPECTED_ERROR,
        500,
        'Test error',
      ));
    });
  });
});