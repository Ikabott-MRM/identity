import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as readline from 'readline';

@Injectable()
export class EncryptionService {
  private encryptionKey: Buffer | null = null;
  private readonly logger = new Logger(EncryptionService.name);
  private readonly encryptedDidFile =
    'src/ssi/persistence/encryptedPortableDid.txt';

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
  private async promptForPasswordAndSaltForDecryption(): Promise<void> {
    const password = await this.promptForUserInput(
      'Enter the encryption password you choose the first time you started the issuer:\n',
    );

    const salt = await this.promptForUserInput(
      'Enter the encryption salt that you previously received by email: \n',
    );

    this.encryptionKey = crypto.scryptSync(password, salt, 32);
  }

  private async promptForPasswordAndEmailForEncryption(): Promise<{
    salt: string;
    emailAddress: string;
  }> {
    const password = await this.promptForUserInput(
      'Enter the encryption password.\nPlease store this password somewhere securely as it will be the only way for you to recover the issuer in case you need to restart it in the future.\nThis password WILL NOT be stored anywhere in the system.: ',
    );

    const emailAddress = await this.promptForUserInput(
      'Enter your email address. We will send you the encrypted file and the salt used for its encryption.\nWith the salt and the encryption key only you know, you will be able to decrypt the file is needed.',
    );
    const salt = crypto.randomBytes(16).toString('hex');
    this.encryptionKey = crypto.scryptSync(password, salt, 32);
    return { salt, emailAddress };
  }

  private async encryptData(data: string): Promise<void> {
    try {
      const { salt, emailAddress } =
        await this.promptForPasswordAndEmailForEncryption();
      if (!this.encryptionKey) {
        throw new Error('Encryption key is not defined.');
      }

      //TODO borrar!! lo uso mientras no tengo que me mande a mi mail
      console.log(`salt es ${salt}`);

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

      //TODO aca habria que mandar el mail con la salt y file content
      fs.writeFileSync(this.encryptedDidFile, JSON.stringify(fileContent));
    } catch (err) {
      this.logger.error(
        `An error occurred while trying to encryp issuer DID.`,
        err.stack,
      );
      throw err;
    }
  }

  private async decryptFile(): Promise<string> {
    try {
      if (!fs.existsSync(this.encryptedDidFile)) return null;

      await this.promptForPasswordAndSaltForDecryption();
      if (!this.encryptionKey) {
        throw new Error('Encryption key is not defined.');
      }

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

  async createDidFile(data: string): Promise<void> {
    await this.encryptData(data);
  }

  async loadDidFile(): Promise<string> {
    return await this.decryptFile();
  }
}
