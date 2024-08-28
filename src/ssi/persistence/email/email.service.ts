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

  isValidEmailAddress(emailAddress: string): boolean {
    const emailRegex = /^[\w\.-]+@[a-zA-Z\d\.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(emailAddress);
  }
}
