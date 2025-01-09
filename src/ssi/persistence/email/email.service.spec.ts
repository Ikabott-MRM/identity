import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { Logger } from '@nestjs/common';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let emailService: EmailService;
  let mailerService: MailerService;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    emailService = module.get<EmailService>(EmailService);
    mailerService = module.get<MailerService>(MailerService);
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log');
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');
  });

  describe('sendMail', () => {
    it('should send an email and log that it has been sent', async () => {
      const mockEmail = 'user@example.com';
      const mockText = {
        salt: 'mockSalt',
        encryptedContent: {
          iv: 'mockIv',
          encryptedData: 'mockEncryptedData',
        },
      };

      await emailService.sendMail(mockEmail, mockText);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: mockEmail,
        subject: 'Salt and Encrypted Portable DID',
        text: `Important Information:\n\nThe encrypted portable DID is: ${mockText.encryptedContent}\n\nThe salt used for encryption is: ${mockText.salt}`,
        html: expect.any(String),
      });

      expect(loggerLogSpy).toHaveBeenCalledWith(
        `Email has been sent to ${mockEmail}`,
      );
    });

    it('should log an error if sending an email fails', async () => {
      const mockEmail = 'user@example.com';
      const mockText = {
        salt: 'mockSalt',
        encryptedContent: {
          iv: 'mockIv',
          encryptedData: 'mockEncryptedData',
        },
      };
      const mockError = new Error('Email sending failed');

      jest.spyOn(mailerService, 'sendMail').mockRejectedValueOnce(mockError);

      await expect(emailService.sendMail(mockEmail, mockText)).rejects.toThrow(
        mockError,
      );

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `An error occurred while trying to send the encrypted portable DID to email ${mockEmail}`,
        mockError.stack,
      );
    });
  });

  describe('sendMailWithAttachment', () => {
    it('should send an email with json file attached and log that it has been sent', async () => {
      const mockEmail = 'user@example.com';

      const mockJsonContent = {
        salt: 'salt',
        iv: 'iv',
        encryptedData: 'hola',
      };
      const jsonFile = {
        filename: 'backedUpDid.json',
        content: JSON.stringify(mockJsonContent),
        contentType: 'application/json',
      };

      await emailService.sendEmailWithAttachment(
        mockEmail,
        mockJsonContent,
        '12345',
      );

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: mockEmail,
        subject: 'Your DID Has Been Backed Up',
        html: expect.any(String),
        attachments: [jsonFile],
      });
    });

    it('should log an error if sending an email fails', async () => {
      const mockEmail = 'user@example.com';
      const mockJsonContent = {
        salt: 'salt',
        iv: 'iv',
        encryptedData: 'hola',
      };

      const mockError = new Error('Email sending failed');

      jest.spyOn(mailerService, 'sendMail').mockRejectedValueOnce(mockError);

      expect(
        await emailService.sendEmailWithAttachment(
          mockEmail,
          mockJsonContent,
          '12345',
        ),
      ).toStrictEqual({
        success: false,
        code: null,
        error: 'Email sending failed',
      });

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `An error occurred while trying to send backed up DID to ${mockEmail}:`,
        mockError.stack,
      );
    });
  });

  describe('isValidEmailAddress', () => {
    it('should return true for a valid email address', () => {
      const validEmail = 'user@example.com';
      expect(emailService.isValidEmailAddress(validEmail)).toBe(true);
    });

    it('should return false for an invalid email address', () => {
      const invalidEmail = 'invalid-email@';
      expect(emailService.isValidEmailAddress(invalidEmail)).toBe(false);
    });
  });

  describe('checkEmailResponse', () => {
    it('should return success true and no error for code 250', () => {
      const info = {
        response:
          '250 2.0.0 OK  1729197858 d9443c01a7336-20e5a75313csm564175ad.105 - gsmtp',
      };

      const result = emailService.checkEmailResponse(info);

      expect(result.success).toBe(true);
      expect(result.code).toBe(250);
      expect(result.error).toBeNull();
    });

    it('should return success false and error for code 550', () => {
      const info = {
        response: '550 5.1.1 Requested action not taken: mailbox unavailable',
      };

      const result = emailService.checkEmailResponse(info);

      expect(result.success).toBe(false);
      expect(result.code).toBe(550);
      expect(result.error).toBe(
        'Requested action not taken: mailbox unavailable',
      );
    });

    it('should return success false and error for code 421', () => {
      const info = {
        response: '421 4.4.2 Service not available',
      };

      const result = emailService.checkEmailResponse(info);

      expect(result.success).toBe(false);
      expect(result.code).toBe(421);
      expect(result.error).toBe('Service not available');
    });

    it('should return success false and error for code 450', () => {
      const info = {
        response:
          '450 4.2.0 Requested mail action not taken: mailbox unavailable',
      };

      const result = emailService.checkEmailResponse(info);

      expect(result.success).toBe(false);
      expect(result.code).toBe(450);
      expect(result.error).toBe(
        'Requested mail action not taken: mailbox unavailable',
      );
    });

    it('should handle codes >= 300 that are not specified in the switch', () => {
      const info = {
        response: '451 4.3.0 Temporary server failure x x - x',
      };

      const result = emailService.checkEmailResponse(info);

      expect(result.success).toBe(false);
      expect(result.code).toBe(451);
      expect(result.error).toBe(
        'Email failed to be sent: Temporary server failure',
      );
    });

    it('should return success false for unknown 3xx code with custom message', () => {
      const info = {
        response: '354 2.0.0 Start mail input x x - x',
      };

      const result = emailService.checkEmailResponse(info);

      expect(result.success).toBe(false);
      expect(result.code).toBe(354);
      expect(result.error).toBe('Email failed to be sent: Start mail input');
    });
  });
});
