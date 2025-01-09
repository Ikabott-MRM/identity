import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendMail(
    to: string,
    text: {
      salt: string;
      encryptedContent: { iv: string; encryptedData: string };
    },
  ) {
    try {
      const htmlMailContent = `
        <b>Important Information</b><br/><br/>
        The encrypted portable DID for the issuer is: <b>${text.encryptedContent.encryptedData}</b><br/><br/>
        The salt used to derive the encryption key with the password you entered when starting the issuer is: <b>${text.salt}</b><br/><br/>
        The iv used to encrypt the portable DID is: <b>${text.encryptedContent.iv}</b><br/><br/>
        The portable DID was encrypted using the crypto module of Node.js with the AES (Advanced Encryption Standard) algorithm in CTR mode (aes-256-ctr).<br/><br/>
        Knowing the algorithm, the iv, the password, the salt, and having the encrypted content, you will be able to decrypt the file if needed.<br/><br/>
        <b>REMEMBER</b> that the password is not stored anywhere. It is up to you to keep it safe.
      `;

      await this.mailerService.sendMail({
        to: to,
        subject: 'Salt and Encrypted Portable DID',
        text: `Important Information:\n\nThe encrypted portable DID is: ${text.encryptedContent}\n\nThe salt used for encryption is: ${text.salt}`,
        html: htmlMailContent,
      });

      this.logger.log(`Email has been sent to ${to}`);
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to send the encrypted portable DID to email ${to}`,
        error.stack,
      );
      throw error;
    }
  }

  async sendEmailWithAttachment(
    to: string,
    jsonContent: {
      salt: string;
      iv: string;
      encryptedData: string;
    },
    verificationCode: string,
  ): Promise<{
    success: boolean;
    code: number;
    error: string | null;
  }> {
    const jsonFile = {
      filename: 'backedUpDid.json',
      content: JSON.stringify(jsonContent),
      contentType: 'application/json',
    };

    const htmlMailContent = `
    <b>Important Information</b><br/><br/>

    Verification code:${verificationCode}
    This is the code you need to enter in the modal that appears in the app.</b><br/><br/>

    Attached to this email, you will find the file that you will need to upload to retrieve your backed-up DID if you install the app again in the future.</b><br/><br/>

    <b>REMEMBER</b> that the password you used for the back up is not stored anywhere. It is up to you to keep it safe, and you will need it to retrieve your DID if you install the app again in the future.
  `;

    const mailOptions = {
      to: to,
      subject: 'Your DID Has Been Backed Up',
      attachments: [jsonFile],
      html: htmlMailContent,
    };

    try {
      const info = await this.mailerService.sendMail(mailOptions);

      const result = this.checkEmailResponse(info);

      if (result.success) {
        this.logger.log(
          `Email with id:${info.messageId} has been sent to ${to}`,
        );
      } else {
        this.logger.log(`Email with id:${info.messageId} failed to be sent.`);
      }
      return {
        success: result.success,
        code: result.code,
        error: result.error,
      };
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to send backed up DID to ${to}:`,
        error.stack,
      );
      return {
        success: false,
        code: null,
        error: error.message,
      };
    }
  }

  isValidEmailAddress(emailAddress: string): boolean {
    const emailRegex = /^[\w\.-]+@[a-zA-Z\d\.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(emailAddress);
  }

  checkEmailResponse(info: { response: string }) {
    const result = {
      success: false,
      code: null as number,
      error: null as string | null,
    };

    const statusCode = parseInt(info.response.split(' ')[0], 10);
    const message = info.response.split(' ').slice(2, -4).join(' ');
    result.code = statusCode;

    switch (statusCode) {
      case 250:
        result.success = true;
        result.error = null;
        break;
      case 550:
        result.success = false;
        result.error = 'Requested action not taken: mailbox unavailable';
        break;
      case 421:
        result.success = false;
        result.error = 'Service not available';
        break;
      case 450:
        result.success = false;
        result.error = 'Requested mail action not taken: mailbox unavailable';
        break;
      default:
        if (statusCode >= 300) {
          result.success = false;
          result.error = `Email failed to be sent: ${message}`;
        }
        break;
    }

    return result;
  }
}
