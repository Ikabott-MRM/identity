import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('Members', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.json('data');
  });

  await knex.schema.createTable('Events', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.dateTime('startDate');
    table.dateTime('endDate');
    table.enum('requireCredential', ['member', 'invitation']).notNullable();
  });

  await knex.schema.createTable('EventAssistance', (table) => {
    table.dateTime('date').notNullable();
    table.string('verifier').notNullable();
    table.integer('memberId').unsigned().notNullable();
    table.integer('eventId').unsigned().notNullable();
    table.foreign('memberId').references('id').inTable('Members');
    table.foreign('eventId').references('id').inTable('Events');
    table.primary(['memberId', 'eventId']);
  });

  await knex.schema.createTable('VerificationCode', (table) => {
    table.integer('memberId').unsigned().notNullable();
    table.string('code').notNullable();
    table.dateTime('expirationDate').notNullable();
    table.foreign('memberId').references('id').inTable('Members');
    table.primary(['memberId', 'code']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('VerificationCode');
  await knex.schema.dropTableIfExists('EventAssistance');
  await knex.schema.dropTableIfExists('Events');
  await knex.schema.dropTableIfExists('Members');
}
