import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
require('dotenv').config();

@Injectable()
export class EncryptionService {
  //TODO ver si no deberia tneer una private variable que guarde key de encryption de credenciales
  //y que se inicialice al inicializar el server en la parte de persistence
  private readonly logger = new Logger(EncryptionService.name);
  constructor() {}

  public deriveSymmmetricKeyFromPassword(
    password: string,
    salt: string | undefined,
  ): Buffer {
    if (!salt) salt = this.generateSalt();
    return crypto.scryptSync(password, salt, 32);
  }

  public generateSymmetricKey(): Buffer {
    return crypto.randomBytes(32); // Clave de 256 bits
  }

  public generateSalt(): string {
    const salt = crypto.randomBytes(16).toString('hex');
    console.log(salt);
    return salt;
  }

  public generateDeterministicIV(credentialId: string, salt: string): Buffer {
    // Combina el credentialId y el salt en un hash
    const hash = crypto
      .createHash('sha256')
      .update(credentialId + salt)
      .digest();
    // Toma los primeros 16 bytes del hash como IV
    return hash.subarray(0, 16);
  }

  async encryptContent(
    content: string,
    encryptionKey: Buffer,
    iv?: Buffer,
  ): Promise<{
    iv: string;
    encryptedData: string;
  }> {
    try {
      if (!iv) iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);

      let encrypted = cipher.update(content, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const fileContent = {
        iv: iv.toString('hex'),
        encryptedData: encrypted,
      };

      return fileContent;
    } catch (err) {
      this.logger.error(
        `An error occurred while trying to encrypt content.`,
        err.stack,
      );
      throw err;
    }
  }

  //TODO ver si esta bueno siempre asumir que iv viene en fileConten o si no es mejor pasar
  //los dos parametros separados
  //porque para desencriptar lo de IPFS yo no voy a estar subiendo el contenido con el IV
  //sino el IV seria publico a todo el munod
  //mejor guardo una salt unica para cada DID y el iv lo voy generando con el hash del CID

  async decryptContent(
    ivString: string,
    encryptedData: string,
    encryptionKey: Buffer,
  ): Promise<string> {
    try {
      const iv = Buffer.from(ivString, 'hex');
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        encryptionKey,
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
