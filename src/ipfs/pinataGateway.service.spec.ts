import { Test, TestingModule } from '@nestjs/testing';
import { PinataGatewayService } from './pinataGateway.service';
import axios from 'axios';
import { Logger } from '@nestjs/common';

jest.mock('axios');

describe('PinataGatewayService', () => {
  let service: PinataGatewayService;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    process.env.PINATA_GATEWAY =
      'https://indigo-major-flamingo-634.mypinata.cloud';
    process.env.PINATA_JWT_TOKEN =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJjMjkxNmFhOC0xMjBlLTQwYjUtYjNhMC1lMDE1OTJlYTYwZTkiLCJlbWFpbCI6InJzYWx2ZXJhZ2xpb0BpbmZ1eS5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiOTQ1ZTVjZTA5ODNlNDVkZTJkMjgiLCJzY29wZWRLZXlTZWNyZXQiOiJkZDc5ZjA2OWZhMTZkNjJjN2VjYzc1YzMyMDM2NjlkNzJkODRmYzhkYWMwOGU3NjljNmFhNDExYTAzNDVmYWFlIiwiZXhwIjoxNzY4MzI5OTQ4fQ.CyKkzGJjihZEkpQc4K8LIhQLp4Z37dMEnLTX4OyRFXw';
    const module: TestingModule = await Test.createTestingModule({
      providers: [PinataGatewayService],
    }).compile();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');

    service = module.get<PinataGatewayService>(PinataGatewayService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.PINATA_JWT_TOKEN; // Clean up after the test
    delete process.env.PINATA_GATEWAY; // Clean up after the test
  });

  describe('uploadContent', () => {
    it('should upload content and return the IPFS hash', async () => {
      const mockResponse = { data: { IpfsHash: 'QmHash123' } };
      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.uploadContent('test content', 'test.txt');
      expect(result).toBe('QmHash123');
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        expect.any(FormData),
        {
          headers: {
            Authorization: `Bearer ${process.env.PINATA_JWT_TOKEN}`,
            'Content-Type': 'multipart/form-data',
          },
        },
      );
    });

    it('should log and throw an error if upload fails', async () => {
      const mockError = new Error('Upload failed');
      (axios.post as jest.Mock).mockRejectedValue(mockError);

      await expect(service.uploadContent('test content')).rejects.toThrow(
        'Upload failed',
      );

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'An error has occurred while uploading content to ipfs',
        mockError,
      );
    });
  });

  describe('getContent', () => {
    it('should retrieve content from IPFS', async () => {
      const mockResponse = { data: 'retrieved content' };
      (axios.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.getContent('QmHash123');
      expect(result).toBe('retrieved content');
      expect(axios.get).toHaveBeenCalledWith(
        `https://indigo-major-flamingo-634.mypinata.cloud/ipfs/QmHash123`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PINATA_JWT_TOKEN}`,
          },
        },
      );
    });

    it('should log and throw an error if retrieval fails', async () => {
      const mockError = new Error('Retrieval failed');
      (axios.get as jest.Mock).mockRejectedValue(mockError);

      await expect(service.getContent('QmHash123')).rejects.toThrow(
        'Retrieval failed',
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'An error has occurred while getting content from ipfs',
        mockError,
      );
    });
  });

  describe('unpinCid', () => {
    it('should unpin a CID and return the response', async () => {
      const mockResponse = { data: 'Unpinned successfully' };
      (axios.delete as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.unpinCid('QmHash123');
      expect(result).toBe('Unpinned successfully');
      expect(axios.delete).toHaveBeenCalledWith(
        `https://api.pinata.cloud/pinning/unpin/QmHash123`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PINATA_JWT_TOKEN}`,
          },
        },
      );
    });

    it('should log and throw an error if unpinning fails', async () => {
      const mockError = new Error('Unpin failed');
      (axios.delete as jest.Mock).mockRejectedValue(mockError);

      await expect(service.unpinCid('QmHash123')).rejects.toThrow(
        'Unpin failed',
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'An error has occurred while deleting content from ipfs',
        mockError,
      );
    });
  });
});
