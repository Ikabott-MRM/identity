import { Inject, Injectable, Logger } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class ApiKeysService {
  constructor(@Inject('KnexConnection') private readonly knex: Knex) {}

  private readonly logger = new Logger(ApiKeysService.name);

  async getHashedApiKeys() {
    try {
      let hashedApiKeys = await this.knex.select('hashed_key').from('api_keys');
      this.logger.log(`There are ${hashedApiKeys.length} active api-keys.`);
      return hashedApiKeys.map(row => row.hashed_key);
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to fetch hashed api-keys from database`,
        error,
      );
    }
  }
}
