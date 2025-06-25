import { Injectable, Logger } from '@nestjs/common';
import * as readline from 'readline';
import { EmailService } from './email/email.service';
import { EncryptionService } from '../../encryption/encryption.service';
import { DidSaltAssociationService } from '../../credentialsRegistry/didSaltAssociation.service';
import { PinataGatewayService } from '../../ipfs/pinataGateway.service';
import { ConfigService } from '@nestjs/config';
require('dotenv').config();

@Injectable()
export class PersistenceService {
  private encryptionKeyIssuerDid: Buffer | null = null;
  private encryptionKeyIssuerCredentials: Buffer | null = null;

  private readonly logger = new Logger(PersistenceService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly encryptionService: EncryptionService,
    private readonly didSaltAssociationService: DidSaltAssociationService,
    private readonly ipfsService: PinataGatewayService,
    private readonly configService: ConfigService,
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

  private async promptForPasswordAndSaltForDecryption(): Promise<void> {
    const password =
      this.configService.get('issuerPersistenceAndRecovery.secretPwd') ??
      // process.env.SECRET_PWD ??
      (await this.promptForUserInput(
        'Enter the encryption password you chose the first time you started the issuer:\n',
      ));

    const saltIssuerDid =
      this.configService.get('issuerPersistenceAndRecovery.issuerDidSalt') ??
      // process.env.SALT_ISSUER_DID ??
      (await this.promptForUserInput(
        'Enter the encryption salt you previously received by email labeled "salt for issuer DID".\n',
      ));

    this.encryptionKeyIssuerDid =
      this.encryptionService.deriveSymmmetricKeyFromPassword(
        password,
        saltIssuerDid,
      );

    const saltIssuerCredentials =
      this.configService.get('issuerPersistenceAndRecovery.credentialsSalt') ??
      // process.env.SALT_ISSUER_CREDENTIALS ??
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
      this.configService.get('issuerPersistenceAndRecovery.secretPwd') ??
      (await this.promptForUserInput(
        'Enter the encryption password.\nPlease store this password securely, as it will be the only way to recover the issuer in case you need to restart it in the future.\nThis password WILL NOT be stored anywhere in the system.:\n',
      ));

    let isValidEmailAddress = false;
    let attempts = 1;
    do {
      let emailAddress =
        this.configService.get('issuerPersistenceAndRecovery.emailAddress') ??
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

      const fileContentCID = await this.ipfsService.uploadContent(
        JSON.stringify(fileContent),
      );
      this.logger.log(
        `Encrypted issuer Did file has been uploaded to IPFS. CID:${fileContentCID}`,
      );

      this.emailService.sendMail(emailAddress, {
        saltIssuerDid,
        saltIssuerCredentials,
        encryptedContentCID: fileContentCID,
        encryptedContent: fileContent,
      });
    } catch (err) {
      this.logger.error(
        `An error occurred while creating the encrypted portable DID string and uploading it to IPFS.`,
        err.stack,
      );
      throw err;
    }
  }

  async loadDidFile(): Promise<string> {
    try {
      const recoverIssuer = Boolean(
        this.configService.get('issuerPersistenceAndRecovery.issuerDidCID'),
      )
        ? true
        : false;

      if (!recoverIssuer) {
        this.logger.log(
          `As no CID has been found, the recovery of the originally initialized issuer is considered declined by the user. A new encrypted file containing a new issuer DID will be generated and uploaded to IPFS.`,
        );
        return null;
      }

      await this.promptForPasswordAndSaltForDecryption();

      const encryptedFileAndIV = (await this.ipfsService.getContent(
        this.configService.get('issuerPersistenceAndRecovery.issuerDidCID'),
      )) as { iv: string; encryptedData: string };

      const decrypted = this.encryptionService.decryptContent(
        encryptedFileAndIV.iv,
        encryptedFileAndIV.encryptedData,
        this.encryptionKeyIssuerDid,
      );

      return decrypted;
    } catch (err) {
      this.logger.error(
        `An error occurred while trying to decrypt issuer DID file obtained from IPFS.`,
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

      const iv = this.encryptionService.generateDeterministicIV(
        credentialId,
        didSalt,
      );

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
