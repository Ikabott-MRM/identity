import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as readline from 'readline';
import { EmailService } from './email/email.service';
require('dotenv').config();

@Injectable()
export class EncryptionService {
  private encryptionKey: Buffer | null = null;
  private readonly logger = new Logger(EncryptionService.name);
  private readonly encryptedDidFile =
    'src/ssi/persistence/encryptedPortableDid.txt';

  constructor(private readonly emailService: EmailService) {}

  private async promptForUserInput(question: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return await new Promise<string>(resolve => {
      rl.question(question, answer => {
        rl.close();
        resolve(answer);
      });
    });
  }

  private async confirmIssuerRecovery(): Promise<boolean> {
    const userInput = await this.promptForUserInput(
      'Do you want to try recovering the issuer? (Y/N):\n',
    );
    return userInput.trim().toUpperCase() === 'Y';
  }

  private async promptForPasswordAndSaltForDecryption(): Promise<void> {
    const password =
      process.env.SECRET_PWD ??
      (await this.promptForUserInput(
        'Enter the encryption password you chose the first time you started the issuer:\n',
      ));

    const salt =
      process.env.SALT ??
      (await this.promptForUserInput(
        'Enter the encryption salt that you previously received by email:\n',
      ));

    this.encryptionKey = crypto.scryptSync(password, salt, 32);
  }

  private async promptForPasswordAndEmailForEncryption(): Promise<{
    salt: string;
    emailAddress: string;
  }> {
    const password =
      process.env.SECRET_PWD ??
      (await this.promptForUserInput(
        'Enter the encryption password.\nPlease store this password securely, as it will be the only way to recover the issuer in case you need to restart it in the future.\nThis password WILL NOT be stored anywhere in the system.:\n',
      ));

    let isValidEmailAddress = false;
    let attempts = 1;
    do {
      let emailAddress =
        process.env.MAIL_ADDRESS ??
        (await this.promptForUserInput(
          attempts == 1
            ? 'Enter your email address. We will send you the encrypted file and the salt used for its encryption.\nWith the salt and the encryption key that only you know, you will be able to decrypt the file needed.\n'
            : 'The email address you entered is invalid. Please enter your email address again:\n',
        ));

      let isValidEmailAddress =
        this.emailService.isValidEmailAddress(emailAddress);
      attempts++;

      if (isValidEmailAddress) {
        const salt = crypto.randomBytes(16).toString('hex');
        this.encryptionKey = crypto.scryptSync(password, salt, 32);
        return { salt, emailAddress };
      }
    } while (!isValidEmailAddress && attempts <= 3);

    throw new Error(
      'Maximum attempts to enter a valid email address have been reached. The issuer will not be initialized. Please resolve this issue before attempting to start it again.',
    );
  }

  async createDidFile(data: string): Promise<void> {
    try {
      const { salt, emailAddress } =
        await this.promptForPasswordAndEmailForEncryption();

      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        this.encryptionKey,
        iv,
      );

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const fileContent = {
        iv: iv.toString('hex'),
        encryptedData: encrypted,
      };

      this.emailService.sendMail(emailAddress, {
        salt,
        encryptedContent: fileContent,
      });
      fs.writeFileSync(this.encryptedDidFile, JSON.stringify(fileContent));
    } catch (err) {
      this.logger.error(
        `An error occurred while trying to encrypt issuer DID.`,
        err.stack,
      );
      throw err;
    }
  }

  async loadDidFile(): Promise<string> {
    try {
      if (!fs.existsSync(this.encryptedDidFile)) return null;

      const recoverIssuer =
        (Boolean(process.env.SALT) && Boolean(process.env.SECRET_PWD)) ? true :
        (await this.confirmIssuerRecovery());
      if (!recoverIssuer) {
        this.logger.log(
          'Recovery of the originally initialized issuer has been declined by the user, or the necessary environment variables are not set. The encrypted file will be overwritten.',
        );
        return null;
      }

      await this.promptForPasswordAndSaltForDecryption();

      const fileContent = JSON.parse(
        fs.readFileSync(this.encryptedDidFile, 'utf8'),
      );
      const iv = Buffer.from(fileContent.iv, 'hex');
      const encryptedData = fileContent.encryptedData;

      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        this.encryptionKey,
        iv,
      );

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (err) {
      this.logger.error(
        `An error occurred while trying to decrypt issuer DID file`,
        err.stack,
      );
      throw err;
    }
  }
}
