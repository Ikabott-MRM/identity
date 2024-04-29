import { Knex } from 'knex';

export function truncateTables(knex: Knex, tables: string[]) {
  return Promise.all(tables.map((table) => knex(table).truncate()));
}
