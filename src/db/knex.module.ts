import { Module } from '@nestjs/common';
import { knex } from 'knex';
import config from '../../knexfile';

function resolveKnexEnv(): keyof typeof config {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production' || env === 'staging' || env === 'test') {
    return env in config ? (env as keyof typeof config) : 'development';
  }
  return 'development';
}

@Module({
  providers: [
    {
      provide: 'KnexConnection',
      useFactory: async () => {
        const envName = resolveKnexEnv();
        const knexConfig = config[envName] || config.development;
        return knex(knexConfig);
      },
    },
  ],
  exports: ['KnexConnection'],
})
export class KnexModule {}
