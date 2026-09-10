import type { Knex } from 'knex';
require('dotenv').config();

const sharedConnection = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  database: process.env.DB_NAME || 'iovf-identity',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'mysql',
    connection: { ...sharedConnection },
    pool: {
      min: 2,
      max: 20,
    },
    migrations: {
      tableName: 'knex_migrations',
    },
  },
  test: {
    client: 'mysql',
    connection: { ...sharedConnection },
    pool: {
      min: 0,
      max: 5,
    },
    migrations: {
      tableName: 'knex_migrations',
    },
  },
  staging: {
    client: 'mysql',
    connection: { ...sharedConnection },
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
    connection: { ...sharedConnection },
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
