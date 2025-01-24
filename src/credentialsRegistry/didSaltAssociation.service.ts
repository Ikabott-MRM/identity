import { Inject, Injectable, Logger } from '@nestjs/common';
import { Knex } from 'knex';
import { retryOperation } from '../helpers/functions';

@Injectable()
export class DidSaltAssociationService {
  constructor(@Inject('KnexConnection') private readonly knex: Knex) {}

  private readonly logger = new Logger(DidSaltAssociationService.name);

  async addDidSaltAssociation(salt: string, didUri: string): Promise<void> {
    try {
      await retryOperation(async () => {
        await this.knex('did_salt').insert({ didUri, salt });
      }, this.logger);
      this.logger.debug(
        `Salt ${salt} has been successfully associated to DIDUri ${didUri} and saved to db.`,
      );
    } catch (error) {
      this.logger.error(
        `An error has occurred while trying to associate salt ${salt} to DIDUri ${didUri}`,
        error.stack,
      );
      throw error;
    }
  }

  async getDidSalt(didUri: string): Promise<string | null> {
    try {
      const result = await this.knex('did_salt')
        .select('salt')
        .where('didUri', didUri)
        .first();

      if (!result) {
        this.logger.debug(
          `No salt was found to be associated with DIDUri ${didUri}`,
        );
        return null;
      } else {
        this.logger.debug(
          `Salt has been found to be associated with DIDUri ${didUri}`,
        );
      }
      return result.salt;
    } catch (error) {
      this.logger.error(
        `An error has occurred while trying to get salt associated to DIDUri ${didUri}`,
        error.stack,
      );
      throw error;
    }
  }
}
