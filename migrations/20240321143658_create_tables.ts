import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('member', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('email').notNullable().unique();
    table.json('data');
  });

  await knex.schema.createTable('event', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.dateTime('startDate');
    table.dateTime('endDate');
    table.string('url');
  });

  await knex.schema.createTable('event_assistance', (table) => {
    table.dateTime('date').notNullable();
    table.string('verifier').notNullable();
    table.integer('memberId').unsigned().notNullable();
    table.integer('eventId').unsigned().notNullable();
    table.foreign('memberId').references('id').inTable('Members');
    table.foreign('eventId').references('id').inTable('Events');
    table.primary(['memberId', 'eventId']);
  });

  await knex.schema.createTable('verification_code', (table) => {
    table.string('code').notNullable();
    table.dateTime('expirationDate').defaultTo(knex.fn.now());
    table.string('email').notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('member');
  await knex.schema.dropTableIfExists('event_assistance');
  await knex.schema.dropTableIfExists('verification_code');
  await knex.schema.dropTableIfExists('event');
}
