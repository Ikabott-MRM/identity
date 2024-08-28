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
});
