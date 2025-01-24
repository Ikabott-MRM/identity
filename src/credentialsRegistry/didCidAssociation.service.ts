import { Inject, Injectable, Logger } from '@nestjs/common';
import { Knex } from 'knex';
import { retryOperation } from '../helpers/functions';

@Injectable()
export class DidCidAssociationService {
  constructor(@Inject('KnexConnection') private readonly knex: Knex) {}

  private readonly logger = new Logger(DidCidAssociationService.name);

  async addCidToDid(cid: string, didUri: string): Promise<void> {
    try {
      await retryOperation(async () => {
        await this.knex('did_cids').insert({ cid: cid, didUri: didUri });
      }, this.logger);
      this.logger.debug(
        `CID ${cid} has been successfully associated to DIDUri ${didUri} and saved to db.`,
      );
    } catch (error) {
      this.logger.error(
        `An error has occurred while trying to associate CID ${cid} to DIDUri ${didUri}`,
        error.stack,
      );
    }
  }

  async getCidsByDid(didUri: string): Promise<string[] | null> {
    try {
      const results = await this.knex('did_cids')
        .select('cid')
        .where('didUri', didUri);

      if (results.length === 0) {
        this.logger.debug(
          `No CIDs were found to be associated with DIDUri ${didUri}`,
        );
        return null;
      } else {
        this.logger.debug(
          `${results.length} CIDs have been found to be associated with DIDUri ${didUri}`,
        );
      }
      return results.map(row => row.cid);
    } catch (error) {
      this.logger.error(
        `An error has occurred while trying to get all CIDs associated to DIDUri ${didUri}`,
        error.stack,
      );
    }
  }
}
