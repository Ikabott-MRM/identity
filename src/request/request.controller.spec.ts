import { Test, TestingModule } from '@nestjs/testing';
import { RequestController } from './request.controller';
import { RequestService, RequestStatus } from './request.service';
import { sendResponse } from '../helpers/functions';

describe('RequestController', () => {
  let controller: RequestController;
  let service: RequestService;

  const mockPendingRequests = [
    { id: '1', status: 'pending' },
    { id: '2', status: 'pending' },
  ];

  const mockRequestService = {
    getRequestById: jest.fn().mockResolvedValue({
      id: '12345',
      schema_id: 'drivers_license',
      status: 'pending',
    }),
    approveRequest: jest.fn().mockResolvedValue({ status: 'approved' }),
    rejectRequest: jest.fn().mockResolvedValue({ status: 'rejected' }),
    createRequest: jest
      .fn()
      .mockResolvedValue({ id: '12345', created_at: new Date() }),
    getRequests: jest.fn().mockResolvedValue([]),
    getRequestsWithStatus: jest.fn().mockResolvedValue(mockPendingRequests),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequestController],
      providers: [
        {
          provide: RequestService,
          useValue: mockRequestService,
        },
      ],
    }).compile();

    controller = module.get<RequestController>(RequestController);
    service = module.get<RequestService>(RequestService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleAction', () => {
    it('should approve the request', async () => {
      const identifiableData = {
        name: 'John',
        lastname: 'Doe',
        category: 'A',
      };

      const result = await controller.handleAction(
        {
          action: 'approve',
          identifiable_data: identifiableData,
          exp_date: '2022-12-31',
        },
        '12345',
      );

      expect(service.getRequestById).toHaveBeenCalledWith('12345');
      expect(result).toEqual(
        sendResponse(
          { status: 'approved' },
          200,
          'Request approved successfully.',
        ),
      );
    });

    it('should reject the request', async () => {
      const identifiableData = {
        name: 'John',
        lastname: 'Doe',
        category: 'A',
      };

      const result = await controller.handleAction(
        {
          action: 'reject',
          ...identifiableData,
        },
        '12345',
      );

      expect(service.rejectRequest).toHaveBeenCalledWith('12345');
      expect(result).toEqual(
        sendResponse(
          { status: 'rejected' },
          200,
          'Request rejected successfully.',
        ),
      );
    });

    it('should return an error for invalid action', async () => {
      const identifiableData = {
        name: 'John',
        lastname: 'Doe',
        category: 'A',
      };

      expect(await controller.handleAction('invalid' as any, '12345')).toEqual({
        error: {
          code: 'ACTION_INVALID',
          message: 'Action should be either "approve" or "reject".',
        },
        status: 400,
      });
    });
  });

  describe('upload', () => {
    it('should create a request', async () => {
      const mockFile = {
        path: 'documents/test.pdf',
        size: 500000,
      } as Express.Multer.File;
      const result = await controller.upload(mockFile, 'test-did', undefined);
      expect(service.createRequest).toHaveBeenCalledWith({
        schema_id: 'drivers_license',
        subject_did: 'test-did',
        document_url: mockFile.path,
      });
      expect(result).toEqual(
        sendResponse(
          { id: '12345', created_at: expect.any(Date) },
          201,
          'Request created successfully.',
        ),
      );
      expect(result.data.created_at).toBeDefined();
      expect(result.data.created_at).toBeInstanceOf(Date);
    });

    it('should throw an error for large file size', async () => {
      const mockFile = {
        size: 2048576,
        path: 'documents/test.pdf',
      } as Express.Multer.File;
      try {
        await controller.upload(mockFile, 'test-did', undefined);
      } catch (error) {
        expect(error.getStatus()).toEqual(400);
        expect(error.message).toEqual('File too large');
      }
    });

    it('should create a production registry request when schema_id is provided', async () => {
      const mockFile = {
        path: 'documents/test.png',
        size: 500000,
      } as Express.Multer.File;
      await controller.upload(mockFile, 'test-did', 'production_registry');
      expect(service.createRequest).toHaveBeenCalledWith({
        schema_id: 'production_registry',
        subject_did: 'test-did',
        document_url: mockFile.path,
      });
    });
  });

  describe('getRequests', () => {
    it('should return all requests when no status is provided', async () => {
      const mockRequests = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'approved' },
        { id: '3', status: 'rejected' },
      ];
      jest.spyOn(service, 'getRequests').mockResolvedValueOnce(mockRequests);

      const result = await controller.getRequests(null);

      expect(service.getRequests).toHaveBeenCalled();
      expect(result).toEqual(
        sendResponse(mockRequests, 200, 'Requests retrieved successfully.'),
      );
    });

    it('should return requests with the specified status', async () => {
      jest
        .spyOn(service, 'getRequestsWithStatus')
        .mockResolvedValueOnce(mockPendingRequests);

      const result = await controller.getRequests(
        RequestStatus.PENDING,
        null,
        null,
      );

      expect(result).toEqual(
        sendResponse([], 200, 'Requests retrieved successfully.'),
      );
    });

    it('should return an error for an invalid status', async () => {
      const result = await controller.getRequests('invalid' as any);

      expect(result).toEqual({
        error: {
          code: 'STATUS_INVALID',
          message:
            'Invalid status. Status should be one of: pending, approved, rejected',
        },
        status: 400,
      });
    });
  });
});
