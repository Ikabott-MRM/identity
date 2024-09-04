import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';
import { EmailService } from './email/email.service';
import * as fs from 'fs';
import { BearerDid, BearerDidSigner } from '@web5/dids';
import { LocalKeyManager } from '@web5/crypto';
import { MailerService } from '@nestjs-modules/mailer';
import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as readline from 'readline';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;
  let emailService: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        EmailService,
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
      ],
    }).compile();

    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug');

    service = module.get<EncryptionService>(EncryptionService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('promptForUserInput', () => {
    it('should return user input', async () => {
      const mockQuestion = 'Question to show on cli:';
      const mockAnswer = 'User input';

      //Mock readline
      const mockReadlineInterface = {
        question: jest.fn((question, callback) => callback(mockAnswer)),
        close: jest.fn(),
      };

      jest
        .spyOn(readline, 'createInterface')
        .mockReturnValue(mockReadlineInterface as any);
      const result = await (service as any).promptForUserInput(mockQuestion);

      expect(readline.createInterface).toHaveBeenCalledWith({
        input: process.stdin,
        output: process.stdout,
      });
      expect(mockReadlineInterface.question).toHaveBeenCalledWith(
        mockQuestion,
        expect.any(Function),
      );
      expect(mockReadlineInterface.close).toHaveBeenCalled();
      expect(result).toBe(mockAnswer);
    });
  });

  describe('confirmIssuerRecovery', () => {
    it('should return true when user inputs "Y"', async () => {
      jest.spyOn(service as any, 'promptForUserInput').mockResolvedValue('Y');
      const result = await (service as any).confirmIssuerRecovery();
      expect(result).toBe(true);
    });

    it('should return false when user inputs "N"', async () => {
      jest.spyOn(service as any, 'promptForUserInput').mockResolvedValue('N');
      const result = await (service as any).confirmIssuerRecovery();
      expect(result).toBe(false);
    });

    it('should return true when user inputs " y "', async () => {
      jest.spyOn(service as any, 'promptForUserInput').mockResolvedValue(' y ');
      const result = await (service as any).confirmIssuerRecovery();
      expect(result).toBe(true);
    });

    it('should return false when user inputs anything other than "Y"', async () => {
      jest.spyOn(service as any, 'promptForUserInput').mockResolvedValue('no');
      const result = await (service as any).confirmIssuerRecovery();
      expect(result).toBe(false);
    });
  });

  describe('createDidFile method', () => {
    it('should create and encrypt DID file and send an email', async () => {
      const mockedDid: BearerDid = {
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

      const mockPortableDid = await mockedDid.export();

      jest
        .spyOn(service as any, 'promptForUserInput')
        .mockImplementationOnce(async () => 'strongpassword') // for password
        .mockImplementationOnce(async () => 'user@example.com'); // for email

      // Mock email validation to return true in order to have encriptionKey defined
      jest.spyOn(emailService, 'isValidEmailAddress').mockReturnValueOnce(true);

      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      jest.spyOn(emailService, 'sendMail').mockImplementation();

      await service.createDidFile(JSON.stringify(mockPortableDid, null, 2));
      expect((service as any).encryptionKey).not.toBeNull();
      expect(emailService.sendMail).toHaveBeenCalledWith('user@example.com', {
        salt: expect.any(String),
        encryptedContent: expect.any(Object),
      });
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'src/ssi/persistence/encryptedPortableDid.txt',
        expect.any(String),
      );
    });

    it(`Should create and encrypt the DID file and send an email, with the first entered email being invalid and the second attempt being valid.`, async () => {
      const mockedDid: BearerDid = {
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

      const mockPortableDid = await mockedDid.export();

      jest
        .spyOn(service as any, 'promptForUserInput')
        .mockImplementationOnce(async () => 'strongpassword') // for password
        .mockImplementationOnce(async () => 'user'); // for email

      // Mock email validation to return false in order for the user to enter a valid email on its second attempt
      jest
        .spyOn(emailService, 'isValidEmailAddress')
        .mockReturnValueOnce(false);
      jest
        .spyOn(service as any, 'promptForUserInput')
        .mockImplementationOnce(async () => 'user@gmail.com'); // for email
      jest.spyOn(emailService, 'isValidEmailAddress').mockReturnValueOnce(true);

      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      jest.spyOn(emailService, 'sendMail').mockImplementation();

      await service.createDidFile(JSON.stringify(mockPortableDid, null, 2));
      expect((service as any).encryptionKey).not.toBeNull();
      expect(emailService.sendMail).toHaveBeenCalledWith('user@gmail.com', {
        salt: expect.any(String),
        encryptedContent: expect.any(Object),
      });
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'src/ssi/persistence/encryptedPortableDid.txt',
        expect.any(String),
      );
    });

    it('should fail on creating and encrypting DID file due to not entering a valid email and reaching max attempts', async () => {
      const mockedDid: BearerDid = {
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

      const mockPortableDid = await mockedDid.export();

      jest
        .spyOn(service as any, 'promptForUserInput')
        .mockImplementationOnce(async () => 'strongpassword') // for password
        .mockImplementationOnce(async () => 'ro'); // for email

      // Mock email validation to return false in order not to have encriptionKey defined
      jest
        .spyOn(emailService, 'isValidEmailAddress')
        .mockReturnValueOnce(false);

      jest
        .spyOn(service as any, 'promptForUserInput')
        .mockImplementationOnce(async () => 'ro'); // for email
      jest
        .spyOn(emailService, 'isValidEmailAddress')
        .mockReturnValueOnce(false);

      jest
        .spyOn(service as any, 'promptForUserInput')
        .mockImplementationOnce(async () => 'ra'); // for email

      //making it fail for the third time
      jest
        .spyOn(emailService, 'isValidEmailAddress')
        .mockReturnValueOnce(false);

      jest.spyOn(fs, 'writeFileSync').mockImplementation();
      jest.spyOn(emailService, 'sendMail').mockImplementation();

      await expect(
        service.createDidFile(JSON.stringify(mockPortableDid, null, 2)),
      ).rejects.toThrow(
        'Maximum attempts to enter a valid email address have been reached. The issuer will not be initialized. Please resolve this issue before attempting to start it again.',
      );
      expect((service as any).encryptionKey).toBeNull();
      expect(emailService.sendMail).not.toHaveBeenCalled();
      expect(fs.writeFileSync).not.toHaveBeenCalled();

      expect(loggerErrorSpy).toHaveBeenNthCalledWith(
        1,
        `An error occurred while trying to encrypt issuer DID.`,
        expect.any(String),
      );
    });
  });

  describe('loadDidFile', () => {
    it('should return decrypted DID file content', async () => {
      const mockFileContent = {
        iv: '22c517a0445b870f0fd65f242df4d665',
        encryptedData: 'encryptedData',
      };
      const mockDecryptedData = 'decryptedData';
      // Mock the methods
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest
        .spyOn(service as any, 'confirmIssuerRecovery')
        .mockResolvedValue(true);
      jest
        .spyOn(service as any, 'promptForUserInput')
        .mockImplementationOnce(async () => 'password') // for password
        .mockImplementationOnce(async () => 'salt'); // for salt

      jest
        .spyOn(fs, 'readFileSync')
        .mockReturnValue(JSON.stringify(mockFileContent));

      jest.spyOn(crypto, 'createDecipheriv').mockReturnValue({
        update: jest.fn().mockReturnValue(mockDecryptedData),
        final: jest.fn().mockReturnValue(''),
      } as any);

      const result = await service.loadDidFile();
      expect((service as any).encryptionKey).not.toBeNull();

      expect(result).toBe(mockDecryptedData);
    });

    it('should catch and log an error that occurred while trying to decrypt DID file content', async () => {
      const mockFileContent = {
        iv: '22c517a0445b870f0fd65f242df4d665',
        encryptedData: 'encryptedData',
      };
      const mockDecryptedData = 'decryptedData';

      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest
        .spyOn(service as any, 'confirmIssuerRecovery')
        .mockResolvedValue(true);
      jest
        .spyOn(service as any, 'promptForUserInput')
        .mockImplementationOnce(async () => 'password') // for password
        .mockImplementationOnce(async () => 'salt'); // for salt

      jest
        .spyOn(fs, 'readFileSync')
        .mockReturnValue(JSON.stringify(mockFileContent));

      jest.spyOn(crypto, 'createDecipheriv').mockReturnValue({
        update: jest.fn().mockReturnValue(mockDecryptedData),
        final: jest.fn().mockImplementationOnce(() => {
          throw new Error('decipher final throw error');
        }),
      } as any);

      await expect(service.loadDidFile()).rejects.toThrow(
        'decipher final throw error',
      );
    });

    it('should return null if the user declines to recover the issuer', async () => {
      delete process.env.SALT;
      delete process.env.SECRET_PWD;

      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest
        .spyOn(service as any, 'confirmIssuerRecovery')
        .mockResolvedValue(false);

      const result = await service.loadDidFile();

      expect(result).toBeNull();
    });
  });
});
