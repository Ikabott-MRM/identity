import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('event', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.dateTime('startDate');
    table.dateTime('endDate');
    table.string('url');
  });

  await knex.schema.createTable('invitee', (table) => {
    table.string('id').primary();
    table.string('firstName').notNullable();
    table.string('lastName').notNullable();
    table.string('email').notNullable();
    table.string('eventId').notNullable();
  });

  await knex.schema.createTable('verification_code', (table) => {
    table.string('code').notNullable();
    table.dateTime('expirationDate').defaultTo(knex.fn.now());
    table.string('email').notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('invitee');
  await knex.schema.dropTableIfExists('verification_code');
  await knex.schema.dropTableIfExists('event');
}
