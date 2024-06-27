import { Test, TestingModule } from '@nestjs/testing';
import { RequestController } from './request.controller';
import { RequestService, RequestStatus } from './request.service';
import { sendResponse } from '../helpers/functions';

describe('RequestController', () => {
  let controller: RequestController;
  let service: RequestService;

  const mockRequestService = {
    approveRequest: jest.fn().mockResolvedValue({ status: 'approved' }),
    rejectRequest: jest.fn().mockResolvedValue({ status: 'rejected' }),
    createRequest: jest.fn().mockResolvedValue({ id: '12345' }),
    getRequests: jest.fn().mockResolvedValue([]),
    getRequestsWithStatus: jest.fn().mockResolvedValue([]),
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
        'test-id',
        'approve',
        identifiableData,
        null,
      );
      expect(service.approveRequest).toHaveBeenCalledWith(
        'test-id',
        identifiableData,
      );

      expect(result).toEqual(
        sendResponse(
          { status: 'approved' },
          200,
          'Request approved successfully.',
        ),
      );
    });

    it('should reject the request', async () => {
      const result = await controller.handleAction(
        'test-id',
        'reject',
        {
          name: 'John',
          lastname: 'Doe',
          category: 'A',
        },
        null,
      );
      expect(service.rejectRequest).toHaveBeenCalledWith('test-id');
      expect(result).toEqual(
        sendResponse(
          { status: 'rejected' },
          200,
          'Request rejected successfully.',
        ),
      );
    });

    it('should return an error for invalid action', async () => {
      const result = await controller.handleAction(
        'test-id',
        'invalid' as any,
        {
          name: 'John',
          lastname: 'Doe',
          category: 'A',
        },
        null,
      );
      expect(result).toEqual(
        sendResponse({}, 400, 'Action should be either "approve" or "reject".'),
      );
    });
  });

  describe('upload', () => {
    it('should create a request', async () => {
      const mockFile = {
        path: 'documents/test.pdf',
        size: 500000,
      } as Express.Multer.File;
      const result = await controller.upload(mockFile, 'test-did');
      expect(service.createRequest).toHaveBeenCalledWith({
        schema_id: 'drivers_license',
        subject_did: 'test-did',
        document_url: mockFile.path,
      });
      expect(result).toEqual(
        sendResponse({ id: '12345' }, 200, 'Request created successfully.'),
      );
    });

    it('should throw an error for large file size', async () => {
      const mockFile = {
        size: 2048576,
        path: 'documents/test.pdf',
      } as Express.Multer.File;
      try {
        await controller.upload(mockFile, 'test-did');
      } catch (error) {
        expect(error.getStatus()).toEqual(400);
        expect(error.message).toEqual('File too large');
      }
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
      const mockPendingRequests = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'pending' },
      ];
      jest
        .spyOn(service, 'getRequestsWithStatus')
        .mockResolvedValueOnce(mockPendingRequests);

      const result = await controller.getRequests(RequestStatus.PENDING);

      expect(service.getRequestsWithStatus).toHaveBeenCalledWith(
        RequestStatus.PENDING,
      );

      expect(result).toEqual(
        sendResponse(
          mockPendingRequests,
          200,
          'Requests retrieved successfully.',
        ),
      );
    });

    it('should return an error for an invalid status', async () => {
      const result = await controller.getRequests('invalid' as any);

      expect(result).toEqual(
        sendResponse(
          {},
          400,
          'Invalid status. Status should be one of: pending, approved, rejected',
        ),
      );
    });
  });
});
