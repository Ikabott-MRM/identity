import { Injectable, Logger } from '@nestjs/common';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { VerifiableCredential } from '@web5/credentials';
/** NOT FOR PRODUCTION
 * se usa storages en filesystem.
 */

type CredentialOfferType = {
  id: string;
  data: object;
  expirationDate?: string;
  type: string[];
};

@Injectable()
export class MemoryTempDataService {
  public readonly filepath: string;

  constructor(params: { filepath: string }) {
    this.filepath = params.filepath;
  }
  private readonly logger = new Logger(MemoryTempDataService.name);
  mapper: Map<string, CredentialOfferType> = new Map();

  async add(data: CredentialOfferType): Promise<void> {
    try {
      if (!data.id) {
        this.logger.error(
          `The data that is trying to be added to the map does not have an id`,
        );
        throw new Error(
          'The data that is trying to be added to the map does not have an id',
        );
      }
      if (this.mapper.has(data.id)) {
        throw new Error('id already exists');
      }
      this.mapper.set(data.id, data);
      this.saveData(this.mapper);
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to save vc data associated to waciInvitationId`,
        error.stack,
      );
      throw error;
    }
  }

  async get(key: string): Promise<CredentialOfferType> {
    try {
      if (!key) {
        throw new Error('No id was passed as parameter');
      }
      this.logger.debug(`key is ${key}`);
      return this.getData().get(key);
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to retrieve vc data model associated to id ${key}`,
        error.stack,
      );
      throw error;
    }
  }

  async getAll(): Promise<Map<string, CredentialOfferType>> {
    return this.getData();
  }

  async remove(key: string): Promise<void> {
    try {
      if (!key) {
        throw new Error('No id was passed as parameter');
      }
      this.mapper.delete(key);
      this.saveData(this.mapper);
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to remove vc data associated to id ${key}`,
        error.stack,
      );
      throw error;
    }
  }

  private getData(): Map<string, CredentialOfferType> {
    if (!existsSync(this.filepath)) {
      return new Map();
    }

    const file = readFileSync(this.filepath, {
      encoding: 'utf-8',
    });

    if (!file) {
      return new Map();
    }

    return new Map(Object.entries(JSON.parse(file)));
  }

  private saveData(data: Map<string, CredentialOfferType>) {
    writeFileSync(this.filepath, JSON.stringify(Object.fromEntries(data)), {
      encoding: 'utf-8',
    });
  }
}
