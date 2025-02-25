import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { EmailService } from './email/email.service';
import { EncryptionService } from '../../encryption/encryption.service';
import { DidSaltAssociationService } from '../../credentialsRegistry/didSaltAssociation.service';
require('dotenv').config();

@Injectable()
export class PersistenceService {
  private encryptionKeyIssuerDid: Buffer | null = null;
  private encryptionKeyIssuerCredentials: Buffer | null = null;

  private readonly logger = new Logger(PersistenceService.name);
  private readonly encryptedDidFile =
    'src/ssi/persistence/encryptedPortableDid.txt';

  constructor(
    private readonly emailService: EmailService,
    private readonly encryptionService: EncryptionService,
    private readonly didSaltAssociationService: DidSaltAssociationService,
  ) {}

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
      'Do you want to attempt recovering the issuer?\n This process will recover the issuer DID and the key used for encrypting the credentials and the credential manifest.\n(Y/N):\n',
    );
    return userInput.trim().toUpperCase() === 'Y';
  }

  private async promptForPasswordAndSaltForDecryption(): Promise<void> {
    const password =
      process.env.SECRET_PWD ??
      (await this.promptForUserInput(
        'Enter the encryption password you chose the first time you started the issuer:\n',
      ));

    const saltIssuerDid =
      process.env.SALT_ISSUER_DID ??
      (await this.promptForUserInput(
        'Enter the encryption salt you previously received by email labeled "salt for issuer DID".\n',
      ));

    this.encryptionKeyIssuerDid =
      this.encryptionService.deriveSymmmetricKeyFromPassword(
        password,
        saltIssuerDid,
      );

    const saltIssuerCredentials =
      process.env.SALT_ISSUER_CREDENTIALS ??
      (await this.promptForUserInput(
        'Enter the encryption salt you previously received by email labeled "salt for issuer credentials".\n',
      ));

    this.encryptionKeyIssuerCredentials =
      this.encryptionService.deriveSymmmetricKeyFromPassword(
        password,
        saltIssuerCredentials,
      );
  }

  private async promptForPasswordAndEmailForEncryption(): Promise<{
    saltIssuerDid: string;
    saltIssuerCredentials: string;
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
            ? 'Enter your email address. We will send you the encrypted file of the portable DID and the salt used for its encryption.\n We will also be sending the salt needed for recovering the encryption key used for ecnrypting/decrypting the credentials issued.\nWith these salts and the password that only you know, you will be able to decrypt the file needed.\n'
            : 'The email address you entered is invalid. Please enter your email address again:\n',
        ));

      let isValidEmailAddress =
        this.emailService.isValidEmailAddress(emailAddress);
      attempts++;

      if (isValidEmailAddress) {
        const saltIssuerDid = this.encryptionService.generateSalt();
        this.encryptionKeyIssuerDid =
          this.encryptionService.deriveSymmmetricKeyFromPassword(
            password,
            saltIssuerDid,
          );

        const saltIssuerCredentials = this.encryptionService.generateSalt();
        this.encryptionKeyIssuerCredentials =
          this.encryptionService.deriveSymmmetricKeyFromPassword(
            password,
            saltIssuerCredentials,
          );
        return { saltIssuerDid, saltIssuerCredentials, emailAddress };
      }
    } while (!isValidEmailAddress && attempts <= 3);

    throw new Error(
      'Maximum attempts to enter a valid email address have been reached. The issuer will not be initialized. Please resolve this issue before attempting to start it again.',
    );
  }

  async createDidFile(data: string): Promise<void> {
    try {
      const { saltIssuerDid, saltIssuerCredentials, emailAddress } =
        await this.promptForPasswordAndEmailForEncryption();

      const fileContent = await this.encryptionService.encryptContent(
        data,
        this.encryptionKeyIssuerDid,
      );
      this.emailService.sendMail(emailAddress, {
        saltIssuerDid,
        saltIssuerCredentials,
        encryptedContent: fileContent,
      });
      fs.writeFileSync(this.encryptedDidFile, JSON.stringify(fileContent));
      this.logger.debug(
        `New encryptedPortableDid txt file has been written to file system.`,
      );
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
      const isInDist = __dirname.endsWith('/dist');

      if (isInDist) {
        this.logger.debug('Running from the /dist directory on Azure');
      } else {
        this.logger.debug('Not running from the /dist directory on Azure');
      }

      this.logger.debug(`running on dirname:${__dirname}`)

      const encryptedDidFilePath = path.join(
        __dirname,
        this.encryptedDidFile,
      ); // adjust path for dist

      this.logger.debug(`file path :${this.encryptedDidFile}`)
      this.logger.debug(`file path with absolute :${encryptedDidFilePath}`)

      this.logger.debug(
        `fle exists w/o absolute path: ${fs.existsSync(this.encryptedDidFile)}`,
      );
      // const absolutePath = path.resolve(process.cwd(), this.encryptedDidFile);
      this.logger.debug(
        `fle exists w absolute path: ${fs.existsSync(encryptedDidFilePath)}`,
      );

      if (!fs.existsSync(encryptedDidFilePath)) return null;

      const recoverIssuer =
        Boolean(process.env.SALT_ISSUER_DID) &&
        Boolean(process.env.SALT_ISSUER_CREDENTIALS) &&
        Boolean(process.env.SECRET_PWD)
          ? true
          : await this.confirmIssuerRecovery();
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

      const decrypted = this.encryptionService.decryptContent(
        fileContent.iv,
        fileContent.encryptedData,
        this.encryptionKeyIssuerDid,
      );

      return decrypted;
    } catch (err) {
      this.logger.error(
        `An error occurred while trying to decrypt issuer DID file`,
        err.stack,
      );
      throw err;
    }
  }

  async encryptCredential(
    data: string,
    holderidUri: string,
    credentialId: string,
  ): Promise<string> {
    try {
      let didSalt =
        await this.didSaltAssociationService.getDidSalt(holderidUri);
      if (!didSalt) {
        didSalt = this.encryptionService.generateSalt();
        await this.didSaltAssociationService.addDidSaltAssociation(
          didSalt,
          holderidUri,
        );
      }

      console.log(credentialId);
      const iv = this.encryptionService.generateDeterministicIV(
        credentialId,
        didSalt,
      );

      console.log(iv.toString('hex'));

      const fileContent = await this.encryptionService.encryptContent(
        data,
        this.encryptionKeyIssuerCredentials,
        iv,
      );

      return fileContent.encryptedData;
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to encrypt credential.`,
        error.stack,
      );
      throw error;
    }
  }

  async decryptCredential(data: string, holderidUri: string): Promise<string> {
    try {
      let didSalt =
        await this.didSaltAssociationService.getDidSalt(holderidUri);
      if (!didSalt)
        throw new Error(
          'There is no salt associated to DID. Initialization vector cannot be determined.',
        );
      //Split the string using '-' as the separator and extract the first part as the credential ID
      const ipfsContent = data.split('-');
      const encryptedCredential = ipfsContent.slice(5).join('-');
      let credentialId = ipfsContent.slice(0, 5).join('-');

      const iv = this.encryptionService.generateDeterministicIV(
        credentialId,
        didSalt,
      );

      const decryptedCredential = await this.encryptionService.decryptContent(
        iv.toString('hex'),
        encryptedCredential,
        this.encryptionKeyIssuerCredentials,
      );

      //TODO devuelvo un string, tengo que pasarlo a formato credencial para devolverlas
      return decryptedCredential;
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to decrypt credential.`,
        error.stack,
      );
      throw error;
    }
  }
}
