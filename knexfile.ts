import type { Knex } from 'knex';
require('dotenv').config();

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'mysql',
    connection: {
      host: process.env.POSTGRES_HOST,
      database: 'iovf-identity',
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    },
    pool: {
      min: 2,
      max: 20,
    },
    migrations: {
      tableName: 'knex_migrations',
    },
  },
  staging: {
    client: 'mysql',
    connection: {
      database: 'iovf-identity',
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
    },
  },
  production: {
    client: 'mysql',
    connection: {
      database: 'iovf-identity',
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
    },
  },
};

export default config;
