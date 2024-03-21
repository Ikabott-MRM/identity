import { Module } from '@nestjs/common';
import { knex } from 'knex';
import config from '../../knexfile';

@Module({
  providers: [
    {
      provide: 'KnexConnection',
      useFactory: async () => {
        const knexInstance = knex(config.development);
        return knexInstance;
      },
    },
  ],
  exports: ['KnexConnection'],
})
export class KnexModule {}
