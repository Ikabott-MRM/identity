import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendMail(
    to: string,
    text: {
      saltIssuerDid: string;
      saltIssuerCredentials: string;
      encryptedContentCID?: string;
      encryptedContent: { iv: string; encryptedData: string };
    },
  ) {
    try {
      const htmlMailContent = `
        <b>Important Information</b><br/><br/>
        <p>
        The encrypted portable DID for the issuer is: <b>${text.encryptedContent.encryptedData}</b><br/><br/>
        The salt used, along with the password you entered when starting the issuer, to derive the encryption key for encrypting the portable DID is: <b>saltIssuerDid: ${text.saltIssuerDid}</b><br/><br/>
        The iv used to encrypt the portable DID is: <b>${text.encryptedContent.iv}</b><br/><br/>
        The salt used, along with the password you entered when starting the issuer, to derive the encryption key for encrypting the issued credentials is: <b>saltIssuerCredentials: ${text.saltIssuerCredentials}</b><br/><br/>
        </p>
        <p>
        ${
          text.encryptedContentCID
            ? `The encrypted portable DID for the issuer has been uploaded to IPFS concatenated with the iv used to encrypt it. Its CID is: <b>${text.encryptedContentCID}</b>. To download it from IPFS you can execute a GET to https://ipfs.io/ipfs/${text.encryptedContentCID}. This will return the same iv as the one displayed above as the iv and the encrypted portable DID as encryptedData.<br/><br/>
        The purpose of sending the CID is for you to be able to set the environment variable needed for defining whether you want to try to recover an already deployed instance of the issuer.<br/><br/>
        <b>REMEMBER</b> that the CID set to try to recover a previous instance <b>MUST</b> be set together with its corresponding <b>SALT_ISSUER_DID</b> and <b>SALT_ISSUER_CREDENTIALS</b>. You cannot use a CID received in one email and the salts from another email, as it will fail in the recovery process.`
            : ''
        }
        </p>
        <p>
          The initialization vector for encrypting credentials before uploading them to IPFS is determined deterministically using the salt associated with the holder DID URI and a hash of the credential ID. 
       <br/><br/>
          The credential ID is uploaded concatenated to the encrypted credential with a hyphen ("-") sign.
       <br/><br/>
          To obtain the IV for decrypting the credentials, you will need to first retrieve the salt associated with the holder DID URI and then apply the following:
        </p>
        <pre>
        <code>
        const hash = crypto
          .createHash('sha256')
          .update(credentialId + salt)
          .digest();
        
        // Take the first 16 bytes of the hash as the IV
        const iv = hash.subarray(0, 16);
        </code>
        </pre>
        <p>
        The encryption keys were derived using the crypto module of Node.js with the 'scryptSync' method and defining a 'keylen' of 32.With the password and the salts, you will be able to derive each of the encryption keys mentioned above.<br/><br/>
        </p>
        <p>
        The portable DID was encrypted using the crypto module of Node.js with the AES (Advanced Encryption Standard) algorithm in CTR mode (aes-256-ctr).<br/><br/>
        Knowing the algorithm, the iv, the password, the salt, and having the encrypted content, you will be able to decrypt the file if needed.<br/><br/>
        </p>
        <b>REMEMBER</b> that the password is not stored anywhere. It is up to you to keep it safe.
      `;

      await this.mailerService.sendMail({
        to: to,
        subject: 'Salts and Encrypted Portable DID',
        text: `Important Information:\n\nThe encrypted portable DID is: ${text.encryptedContent}\n\nThe salt used for encryption of the portable did is saltIssuerDid: ${text.saltIssuerDid}\n. The salt used for the ecryption key used for encrypting credentials is saltIssuerCredentials: ${text.saltIssuerCredentials}`,
        html: htmlMailContent,
      });

      this.logger.log(`Email has been sent to ${to}`);
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to send the encrypted portable DID and salts to email ${to}`,
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
