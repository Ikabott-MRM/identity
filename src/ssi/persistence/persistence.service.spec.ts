import { Test, TestingModule } from '@nestjs/testing';
import { PersistenceService } from './persistence.service';
import { EmailService } from './email/email.service';
import * as fs from 'fs';
import { BearerDid, BearerDidSigner } from '@web5/dids';
import { LocalKeyManager } from '@web5/crypto';
import { MailerService } from '@nestjs-modules/mailer';
import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as readline from 'readline';
import { EncryptionService } from '../../encryption/encryption.service';
import { DidSaltAssociationService } from '../../credentialsRegistry/didSaltAssociation.service';
import { Knex } from 'knex';

describe('EncryptionService', () => {
  let service: PersistenceService;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;
  let emailService: EmailService;
  let knex: Knex;
  let didSaltAssociationService: DidSaltAssociationService;
  let encryptionService: EncryptionService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersistenceService,
        EmailService,
        EncryptionService,
        DidSaltAssociationService,
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
      ],
    }).compile();

    knex = module.get<Knex>('KnexConnection');

    await knex.schema.createTable('did_salt', table => {
      table.string('didUri').primary();
      table.timestamp('salt').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });

    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug');

    service = module.get<PersistenceService>(PersistenceService);
    emailService = module.get<EmailService>(EmailService);
    encryptionService = module.get<EncryptionService>(EncryptionService);

    didSaltAssociationService = module.get<DidSaltAssociationService>(
      DidSaltAssociationService,
    );
  });

  beforeEach(async () => {
    (service as any).encryptionKeyIssuerDid = null;
    (service as any).encryptionKeyIssuerCredentials = null;

    await knex('did_salt').del();
  });

  afterAll(async () => {
    await knex.destroy();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    delete process.env.SALT_ISSUER_DID;
    delete process.env.SALT_ISSUER_CREDENTIALS;
    delete process.env.SECRET_PWD;
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
      expect((service as any).encryptionKeyIssuerDid).not.toBeNull();
      expect((service as any).encryptionKeyIssuerCredentials).not.toBeNull();

      expect(emailService.sendMail).toHaveBeenCalledWith('user@example.com', {
        saltIssuerDid: expect.any(String),
        saltIssuerCredentials: expect.any(String),
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
      expect((service as any).encryptionKeyIssuerDid).not.toBeNull();
      expect((service as any).encryptionKeyIssuerCredentials).not.toBeNull();

      expect(emailService.sendMail).toHaveBeenCalledWith('user@gmail.com', {
        saltIssuerDid: expect.any(String),
        saltIssuerCredentials: expect.any(String),
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
      expect((service as any).encryptionKeyIssuerDid).toBeNull();
      expect((service as any).encryptionKeyIssuerCredentials).toBeNull();

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
      expect((service as any).encryptionKeyIssuerDid).not.toBeNull();
      expect((service as any).encryptionKeyIssuerCredentials).not.toBeNull();

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
      delete process.env.SALT_ISSUER_DID;
      delete process.env.SALT_ISSUER_CREDENTIALS;
      delete process.env.SECRET_PWD;

      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest
        .spyOn(service as any, 'confirmIssuerRecovery')
        .mockResolvedValue(false);

      const result = await service.loadDidFile();

      expect(result).toBeNull();
    });
  });

  it('should encrypt and decrypt a credential successfully', async () => {
    const mockData = 'mockCredentialData';
    const mockHolderUri = 'did:example:123';
    const mockCredentialId = 'credential-123-456-789-101112';

    // Mock didSaltAssociationService methods
    const mockSalt = 'mockSalt';
    jest
      .spyOn(didSaltAssociationService, 'getDidSalt')
      .mockResolvedValueOnce(null); // Simulate no existing salt
    jest
      .spyOn(didSaltAssociationService, 'addDidSaltAssociation')
      .mockResolvedValueOnce(undefined); // Simulate successful salt addition

    // Mock encryptionService methods
    const mockIv = Buffer.from('mockIv');
    const mockEncryptedData = 'mockEncryptedData';
    jest.spyOn(encryptionService, 'generateSalt').mockReturnValue(mockSalt);
    jest
      .spyOn(encryptionService, 'generateDeterministicIV')
      .mockReturnValue(mockIv);
    jest.spyOn(encryptionService, 'encryptContent').mockResolvedValueOnce({
      iv: 'test-iv',
      encryptedData: mockEncryptedData,
    });

    // Call encryptCredential
    const encryptedData = await service.encryptCredential(
      mockData,
      mockHolderUri,
      mockCredentialId,
    );

    expect(didSaltAssociationService.getDidSalt).toHaveBeenCalledWith(
      mockHolderUri,
    );
    expect(
      didSaltAssociationService.addDidSaltAssociation,
    ).toHaveBeenCalledWith(mockSalt, mockHolderUri);
    expect(encryptionService.generateDeterministicIV).toHaveBeenCalledWith(
      mockCredentialId,
      mockSalt,
    );
    expect(encryptionService.encryptContent).toHaveBeenCalledWith(
      mockData,
      service['encryptionKeyIssuerCredentials'],
      mockIv,
    );
    expect(encryptedData).toBe(mockEncryptedData);

    // Test decryptCredential
    jest
      .spyOn(didSaltAssociationService, 'getDidSalt')
      .mockResolvedValueOnce(mockSalt);
    jest
      .spyOn(encryptionService, 'decryptContent')
      .mockResolvedValueOnce(mockData);

    const decryptedData = await service.decryptCredential(
      `${mockCredentialId}-${mockEncryptedData}`,
      mockHolderUri,
    );

    expect(didSaltAssociationService.getDidSalt).toHaveBeenCalledWith(
      mockHolderUri,
    );
    expect(encryptionService.generateDeterministicIV).toHaveBeenCalledWith(
      mockCredentialId,
      mockSalt,
    );
    expect(encryptionService.decryptContent).toHaveBeenCalledWith(
      mockIv.toString('hex'),
      mockEncryptedData,
      service['encryptionKeyIssuerCredentials'],
    );
    expect(decryptedData).toBe(mockData);
  });

  it('should throw an error when decrypting without an associated salt', async () => {
    const mockData = 'mockCredentialData';
    const mockHolderUri = 'did:example:123';

    jest
      .spyOn(didSaltAssociationService, 'getDidSalt')
      .mockResolvedValueOnce(null); // Simulate no salt

    await expect(
      service.decryptCredential(mockData, mockHolderUri),
    ).rejects.toThrow(
      'There is no salt associated to DID. Initialization vector cannot be determined.',
    );
  });
});
