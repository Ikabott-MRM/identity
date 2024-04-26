import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('event', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.dateTime('startDate');
    table.dateTime('endDate');
    table.string('organizer').notNullable();
    table.string('url');
  });

  await knex.schema.createTable('invitee', (table) => {
    table.string('id').primary();
    table.string('firstName').notNullable();
    table.string('lastName').notNullable();
    table.string('email').notNullable();
    table.string('eventId').notNullable();
    table.string('ticketType').notNullable();
    table.string('company').notNullable();
    table.string('orderId').notNullable();
  });

  await knex.schema.createTable('order', (table) => {
    table.string('id').primary();
    table.string('firstName').notNullable();
    table.string('lastName').notNullable();
    table.dateTime('createdAt').notNullable();
    table.string('email').notNullable();
    table.string('eventId').notNullable();
    table.string('status').notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('invitee');
  await knex.schema.dropTableIfExists('verification_code');
  await knex.schema.dropTableIfExists('event');
}
