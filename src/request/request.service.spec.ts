import { Test, TestingModule } from '@nestjs/testing';
import {
  RequestAlreadyProcessedError,
  RequestService,
  RequestStatus,
  VerificationRequest,
} from './request.service';
import { Knex } from 'knex';
import { IssuerAgentService } from '../ssi/issuerAgent.service';
import { NotFoundException } from '@nestjs/common';

describe('RequestService - Integration Tests', () => {
  let service: RequestService;
  let knex: Knex;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestService,
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
        {
          provide: IssuerAgentService,
          useValue: {
            issueCredential: jest.fn().mockResolvedValue({
              success: true,
              result: 'credential-id',
              error: null,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RequestService>(RequestService);
    knex = module.get<Knex>('KnexConnection');

    // Create the request table
    await knex.schema.createTable('request', table => {
      table.uuid('id').primary();
      table.string('code').unique();
      table.string('schema_id');
      table.string('subject_did');
      table.string('document_url');
      table.string('status').defaultTo('pending');
    });
  });

  afterAll(async () => {
    await knex.destroy();
  });

  beforeEach(async () => {
    // Clear the request table before each test
    await knex('request').del();
  });

  it('should create a new request', async () => {
    const requestData: VerificationRequest = {
      schema_id: 'schema123',
      subject_did: 'did:example:123',
      document_url: 'https://example.com/document',
    };

    const createdRequest = await service.createRequest(requestData);

    expect(createdRequest).toBeDefined();
    expect(createdRequest.id).toBeDefined();
    expect(createdRequest.code).toBeDefined();
    expect(createdRequest.schema_id).toBe(requestData.schema_id);
    expect(createdRequest.subject_did).toBe(requestData.subject_did);
    expect(createdRequest.document_url).toBe(requestData.document_url);

    // Verify the request was actually saved to the database
    const savedRequest = await knex('request')
      .where({ id: createdRequest.id })
      .first();
    expect(savedRequest).toBeDefined();
    expect(savedRequest).toEqual(createdRequest);
  });

  it('should create a new request with provided id', async () => {
    const requestData: VerificationRequest = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      schema_id: 'schema123',
      subject_did: 'did:example:123',
      document_url: 'https://example.com/document',
    };

    const createdRequest = await service.createRequest(requestData);

    expect(createdRequest.id).toBe(requestData.id);

    // Verify the request was actually saved to the database with the provided id
    const savedRequest = await knex('request')
      .where({ id: requestData.id })
      .first();
    expect(savedRequest).toBeDefined();
    expect(savedRequest.id).toBe(requestData.id);
  });

  it('should generate a unique code', async () => {
    const requestData: VerificationRequest = {
      schema_id: 'schema123',
      subject_did: 'did:example:123',
      document_url: 'https://example.com/document',
    };

    const createdRequest1 = await service.createRequest(requestData);
    const createdRequest2 = await service.createRequest(requestData);

    expect(createdRequest1.code).not.toBe(createdRequest2.code);
  });

  it('should approve a pending request', async () => {
    const requestData: VerificationRequest = {
      schema_id: 'schema123',
      subject_did: 'did:example:123',
      document_url: 'https://example.com/document',
    };

    // Create a new request
    const createdRequest = await service.createRequest(requestData);

    // Mock the issuer service's issueCredential method to simulate successful issuance

    // Approve the request
    const identifiableData = { name: 'John', lastname: 'Doe', category: 'A' };
    const approvedRequest = await service.approveRequest(
      createdRequest.id,
      identifiableData,
      '2025-12-31',
    );

    expect(approvedRequest).toBeDefined();
    expect(approvedRequest.status).toBe(RequestStatus.APPROVED);

    // Verify the request status in the database
    const savedRequest = await knex('request')
      .where({ id: createdRequest.id })
      .first();
    expect(savedRequest.status).toBe(RequestStatus.APPROVED);
  });

  it('should throw an error if the request does not exist', async () => {
    await expect(
      service.approveRequest(
        'non-existent-id',
        { name: 'John', lastname: 'Doe', category: 'A' },
        '2025-12-31',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw an error if the request is already processed', async () => {
    const requestData: VerificationRequest = {
      schema_id: 'schema123',
      subject_did: 'did:example:123',
      document_url: 'https://example.com/document',
    };

    // Create a new request
    const createdRequest = await service.createRequest(requestData);

    // Mark the request as approved
    await knex('request')
      .where({ id: createdRequest.id })
      .update({ status: RequestStatus.APPROVED });

    // Attempt to approve the already processed request
    await expect(
      service.approveRequest(
        createdRequest.id,
        { name: 'John', lastname: 'Doe', category: 'A' },
        '2025-12-31',
      ),
    ).rejects.toThrow(RequestAlreadyProcessedError);
  });

  it('should reject a pending request', async () => {
    const requestData: VerificationRequest = {
      schema_id: 'schema123',
      subject_did: 'did:example:123',
      document_url: 'https://example.com/document',
    };

    // Create a new request
    const createdRequest = await service.createRequest(requestData);

    // Reject the request
    const rejectedRequest = await service.rejectRequest(createdRequest.id);

    expect(rejectedRequest).toBeDefined();
    expect(rejectedRequest.status).toBe(RequestStatus.REJECTED);

    // Verify the request status in the database
    const savedRequest = await knex('request')
      .where({ id: createdRequest.id })
      .first();
    expect(savedRequest.status).toBe(RequestStatus.REJECTED);
  });

  it('should throw an error if the request is already processed when rejecting', async () => {
    const requestData: VerificationRequest = {
      schema_id: 'schema123',
      subject_did: 'did:example:123',
      document_url: 'https://example.com/document',
    };

    // Create a new request
    const createdRequest = await service.createRequest(requestData);

    // Mark the request as approved
    await knex('request')
      .where({ id: createdRequest.id })
      .update({ status: RequestStatus.APPROVED });

    // Attempt to reject the already processed request
    await expect(service.rejectRequest(createdRequest.id)).rejects.toThrow(
      RequestAlreadyProcessedError,
    );
  });

  it('should return all requests without any filters', async () => {
    // Create multiple requests
    const requestData1: VerificationRequest = {
      schema_id: 'schema123',
      subject_did: 'did:example:123',
      document_url: 'https://example.com/document1',
    };
    const requestData2: VerificationRequest = {
      schema_id: 'schema456',
      subject_did: 'did:example:456',
      document_url: 'https://example.com/document2',
    };

    await service.createRequest(requestData1);
    await service.createRequest(requestData2);

    // Get all requests
    const requests = await service.getRequests();

    expect(requests).toHaveLength(2);
    expect(requests[0].schema_id).toBe(requestData1.schema_id);
    expect(requests[1].schema_id).toBe(requestData2.schema_id);
  });

  it('should filter requests by status', async () => {
    // Create a pending request
    const requestData1: VerificationRequest = {
      schema_id: 'schema123',
      subject_did: 'did:example:123',
      document_url: 'https://example.com/document1',
    };
    const createdRequest = await service.createRequest(requestData1);

    // Approve the request to change its status
    await knex('request')
      .where({ id: createdRequest.id })
      .update({ status: RequestStatus.APPROVED });

    // Get requests with status 'approved'
    const requests = await service.getRequests({
      status: RequestStatus.APPROVED,
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].status).toBe(RequestStatus.APPROVED);
  });

  it('should filter requests by schema_id', async () => {
    // Create multiple requests with different schema_ids
    const requestData1: VerificationRequest = {
      schema_id: 'schema123',
      subject_did: 'did:example:123',
      document_url: 'https://example.com/document1',
    };
    const requestData2: VerificationRequest = {
      schema_id: 'schema456',
      subject_did: 'did:example:456',
      document_url: 'https://example.com/document2',
    };

    await service.createRequest(requestData1);
    await service.createRequest(requestData2);

    // Get requests filtered by schema_id
    const requests = await service.getRequests({ schema_id: 'schema123' });

    expect(requests).toHaveLength(1);
    expect(requests[0].schema_id).toBe('schema123');
  });

  it('should filter requests by subject_did', async () => {
    // Create multiple requests with different subject_dids
    const requestData1: VerificationRequest = {
      schema_id: 'schema123',
      subject_did: 'did:example:123',
      document_url: 'https://example.com/document1',
    };
    const requestData2: VerificationRequest = {
      schema_id: 'schema456',
      subject_did: 'did:example:456',
      document_url: 'https://example.com/document2',
    };

    await service.createRequest(requestData1);
    await service.createRequest(requestData2);

    // Get requests filtered by subject_did
    const requests = await service.getRequests({
      subject_did: 'did:example:123',
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].subject_did).toBe('did:example:123');
  });

  it('should reject a pending request', async () => {
    const requestData: VerificationRequest = {
      schema_id: 'schema123',
      subject_did: 'did:example:123',
      document_url: 'https://example.com/document',
    };

    // Create a new request
    const createdRequest = await service.createRequest(requestData);

    // Reject the request
    const result = await service.rejectRequest(createdRequest.id);

    expect(result).toBeDefined();
    expect(result.status).toBe(RequestStatus.REJECTED);

    // Verify the request status in the database
    const savedRequest = await knex('request')
      .where({ id: createdRequest.id })
      .first();
    expect(savedRequest.status).toBe(RequestStatus.REJECTED);
  });

  it('should throw an error if the request does not exist', async () => {
    await expect(service.rejectRequest('non-existent-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw an error if the request is already processed', async () => {
    const requestData: VerificationRequest = {
      schema_id: 'schema123',
      subject_did: 'did:example:123',
      document_url: 'https://example.com/document',
    };

    // Create a new request
    const createdRequest = await service.createRequest(requestData);

    // Mark the request as approved
    await knex('request')
      .where({ id: createdRequest.id })
      .update({ status: RequestStatus.APPROVED });

    // Attempt to reject the already processed request
    await expect(service.rejectRequest(createdRequest.id)).rejects.toThrow(
      RequestAlreadyProcessedError,
    );
  });

  it('should return all requests without any filters', async () => {
    // Insert some requests into the database
    await knex('request').insert([
      {
        id: '1',
        code: 'code1',
        schema_id: 'schema1',
        subject_did: 'did:example:1',
        document_url: 'https://example.com/doc1',
        status: RequestStatus.PENDING,
      },
      {
        id: '2',
        code: 'code2',
        schema_id: 'schema2',
        subject_did: 'did:example:2',
        document_url: 'https://example.com/doc2',
        status: RequestStatus.APPROVED,
      },
    ]);

    const requests = await service.getRequests();
    expect(requests).toHaveLength(2);
  });

  it('should filter requests by status', async () => {
    // Insert some requests into the database
    await knex('request').insert([
      {
        id: '3',
        code: 'code3',
        schema_id: 'schema1',
        subject_did: 'did:example:1',
        document_url: 'https://example.com/doc3',
        status: RequestStatus.PENDING,
      },
      {
        id: '4',
        code: 'code4',
        schema_id: 'schema2',
        subject_did: 'did:example:2',
        document_url: 'https://example.com/doc4',
        status: RequestStatus.APPROVED,
      },
    ]);

    const pendingRequests = await service.getRequests({
      status: RequestStatus.PENDING,
    });
    expect(pendingRequests).toHaveLength(1);
    expect(pendingRequests[0].status).toBe(RequestStatus.PENDING);

    const approvedRequests = await service.getRequests({
      status: RequestStatus.APPROVED,
    });
    expect(approvedRequests).toHaveLength(1);
    expect(approvedRequests[0].status).toBe(RequestStatus.APPROVED);
  });

  it('should filter requests by schema_id', async () => {
    // Insert some requests into the database
    await knex('request').insert([
      {
        id: '5',
        code: 'code5',
        schema_id: 'schema1',
        subject_did: 'did:example:3',
        document_url: 'https://example.com/doc5',
        status: RequestStatus.PENDING,
      },
      {
        id: '6',
        code: 'code6',
        schema_id: 'schema2',
        subject_did: 'did:example:4',
        document_url: 'https://example.com/doc6',
        status: RequestStatus.REJECTED,
      },
    ]);

    const schema1Requests = await service.getRequests({ schema_id: 'schema1' });
    expect(schema1Requests).toHaveLength(1);
    expect(schema1Requests[0].schema_id).toBe('schema1');
  });

  it('should filter requests by subject_did', async () => {
    // Insert some requests into the database
    await knex('request').insert([
      {
        id: '7',
        code: 'code7',
        schema_id: 'schema3',
        subject_did: 'did:example:5',
        document_url: 'https://example.com/doc7',
        status: RequestStatus.PENDING,
      },
      {
        id: '8',
        code: 'code8',
        schema_id: 'schema4',
        subject_did: 'did:example:6',
        document_url: 'https://example.com/doc8',
        status: RequestStatus.REJECTED,
      },
    ]);

    const subjectRequests = await service.getRequests({
      subject_did: 'did:example:5',
    });
    expect(subjectRequests).toHaveLength(1);
    expect(subjectRequests[0].subject_did).toBe('did:example:5');
  });

  it('should reject a pending request', async () => {
    const requestData: VerificationRequest = {
      schema_id: 'schema1',
      subject_did: 'did:example:1',
      document_url: 'https://example.com/doc1',
    };

    // Create a new request
    const createdRequest = await service.createRequest(requestData);

    // Reject the request
    const result = await service.rejectRequest(createdRequest.id);

    expect(result).toBeDefined();
    expect(result.status).toBe(RequestStatus.REJECTED);

    // Verify the request status in the database
    const savedRequest = await knex('request')
      .where({ id: createdRequest.id })
      .first();
    expect(savedRequest.status).toBe(RequestStatus.REJECTED);
  });

  it('should throw an error if the request does not exist when rejecting', async () => {
    await expect(service.rejectRequest('non-existent-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw an error if the request is already processed when rejecting', async () => {
    const requestData: VerificationRequest = {
      schema_id: 'schema2',
      subject_did: 'did:example:2',
      document_url: 'https://example.com/doc2',
    };

    // Create a new request
    const createdRequest = await service.createRequest(requestData);

    // Manually update the request status to approved
    await knex('request')
      .where({ id: createdRequest.id })
      .update({ status: RequestStatus.APPROVED });

    // Attempt to reject the already processed request
    await expect(service.rejectRequest(createdRequest.id)).rejects.toThrow(
      RequestAlreadyProcessedError,
    );
  });
});
