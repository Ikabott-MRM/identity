import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';
import * as crypto from 'crypto';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EncryptionService],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deriveSymmmetricKeyFromPassword', () => {
    it('should derive a symmetric key from password and salt', () => {
      const password = 'testPassword';
      const salt = 'testSalt';
      const mockKey = Buffer.from('mockedKey');

      jest.spyOn(crypto, 'scryptSync').mockReturnValue(mockKey);
      const result = service.deriveSymmmetricKeyFromPassword(password, salt);

      expect(result).toEqual(mockKey);
      expect(crypto.scryptSync).toHaveBeenCalledWith(password, salt, 32);
    });

    it('should generate a salt if not provided', () => {
      const password = 'testPassword';
      const mockSalt = 'abcdef1234567890';
      const mockKey = Buffer.from('mockedKey');

      jest.spyOn(crypto, 'randomBytes').mockImplementation(() => {
        return Buffer.from(mockSalt, 'hex');
      });
      jest.spyOn(crypto, 'scryptSync').mockReturnValue(mockKey);

      const result = service.deriveSymmmetricKeyFromPassword(
        password,
        undefined,
      );

      expect(result).toEqual(mockKey);
      expect(crypto.randomBytes).toHaveBeenCalledWith(16);
      expect(crypto.scryptSync).toHaveBeenCalledWith(password, mockSalt, 32);
    });
  });

  describe('generateSymmetricKey', () => {
    it('should generate a symmetric key', () => {
      const mockKey = Buffer.from('mockedKey');

      jest.spyOn(crypto, 'randomBytes').mockImplementation(() => {
        return mockKey;
      });

      const result = service.generateSymmetricKey();

      expect(result).toEqual(mockKey);
      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
    });
  });

  describe('generateSalt', () => {
    it('should generate a salt', () => {
      const mockSalt = 'abcdef1234567890';

      jest.spyOn(crypto, 'randomBytes').mockImplementation(() => {
        return Buffer.from(mockSalt, 'hex');
      });

      const result = service.generateSalt();

      expect(result).toEqual(mockSalt);
      expect(crypto.randomBytes).toHaveBeenCalledWith(16);
    });
  });

  describe('encryptContent', () => {
    it('should encrypt content', async () => {
      const content = 'test content';
      const encryptionKey = Buffer.from('encryptionKey');
      const iv = Buffer.from('iv');
      const encryptedData = 'encryptedData';

      jest.spyOn(crypto, 'randomBytes').mockImplementation(() => {
        return Buffer.from(iv);
      });

      jest.spyOn(crypto, 'createCipheriv').mockReturnValue({
        update: jest.fn().mockReturnValue(encryptedData),
        final: jest.fn().mockReturnValue(''),
      } as any);

      const result = await service.encryptContent(content, encryptionKey);

      expect(result.iv).toEqual(iv.toString('hex'));
      expect(result.encryptedData).toEqual(encryptedData);
      expect(crypto.createCipheriv).toHaveBeenCalledWith(
        'aes-256-cbc',
        encryptionKey,
        iv,
      );
    });

    it('should throw an error if encryption fails', async () => {
      const content = 'test content';
      const encryptionKey = Buffer.from('encryptionKey');
      const encryptedData = 'encryptedData';

      jest.spyOn(crypto, 'createCipheriv').mockReturnValue({
        update: jest.fn().mockReturnValue(encryptedData),
        final: jest.fn().mockImplementationOnce(() => {
          throw new Error('cipher final throw error');
        }),
      } as any);

      await expect(
        service.encryptContent(content, encryptionKey),
      ).rejects.toThrow(new Error('cipher final throw error'));
    });
  });

  describe('decryptContent', () => {
    it('should decrypt content', async () => {
      const ivString = 'iv';
      const encryptedData = 'encryptedData';
      const encryptionKey = Buffer.from('encryptionKey');
      const decryptedData = 'decryptedData';

      jest.spyOn(crypto, 'createDecipheriv').mockReturnValue({
        update: jest.fn().mockReturnValue(decryptedData),
        final: jest.fn().mockReturnValue(''),
      } as any);

      const result = await service.decryptContent(
        ivString,
        encryptedData,
        encryptionKey,
      );

      expect(result).toEqual(decryptedData);
      expect(crypto.createDecipheriv).toHaveBeenCalledWith(
        'aes-256-cbc',
        encryptionKey,
        Buffer.from(ivString, 'hex'),
      );
    });

    it('should throw an error if decryption fails', async () => {
      const ivString = 'iv';
      const encryptedData = 'encryptedData';
      const encryptionKey = Buffer.from('encryptionKey');

      jest.spyOn(crypto, 'createDecipheriv').mockReturnValue({
        update: jest.fn().mockReturnValue(encryptedData),
        final: jest.fn().mockImplementationOnce(() => {
          throw new Error('decipher final throw error');
        }),
      } as any);

      await expect(
        service.decryptContent(ivString, encryptedData, encryptionKey),
      ).rejects.toThrow(new Error('decipher final throw error'));
    });
  });
});
