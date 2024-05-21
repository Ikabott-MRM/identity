import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableIfNotExists('event', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.dateTime('startDate').notNullable();
    table.dateTime('endDate').notNullable();
    table.string('organizer').notNullable();
    table.string('location').notNullable();
    table.string('url');
  });

  await knex.schema.createTableIfNotExists('person', (table) => {
    table.string('id').primary();
    table.string('email').notNullable();
    table.string('firstName').notNullable();
    table.string('lastName').notNullable();
    table.string('company').notNullable();
    table.string('position').notNullable();
    table.string('memberId').notNullable();
  });

  await knex.schema.createTableIfNotExists('credential', (table) => {
    table.string('id').primary();
    table.string('credential').notNullable();
    table.boolean('emitted').notNullable();
  });

  await knex.schema.createTableIfNotExists('credential_offer', (table) => {
    table.string('id').primary();
    table.string('credential_offer').notNullable();
    table.boolean('emitted').notNullable();
  });

  await knex.schema.createTableIfNotExists('order', (table) => {
    table.string('id').primary();
    table.dateTime('createdAt').notNullable();
    table.string('email').notNullable();
    table.string('eventId').notNullable().references('event.id');
    table.string('status').notNullable();
  });

  await knex.schema.createTableIfNotExists('invitation', (table) => {
    table.string('id').primary();
    table.string('eventId').notNullable();
    table.string('personId').notNullable().references('person.id');
    table.string('ticketType').notNullable();
    table.string('credentialOfferId').references('credential_offer.id');
    table.string('credentialId').references('credential.id');
    table.string('orderId');
  });

  await knex.schema.alterTable('order', (table) => {
    table.string('invitationId').references('invitation.id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('order', (table) => {
    table.dropForeign('invitationId');
    table.dropColumn('invitationId');
  });

  await knex.schema.dropTableIfExists('invitation');
  await knex.schema.dropTableIfExists('order');
  await knex.schema.dropTableIfExists('credential_offer');
  await knex.schema.dropTableIfExists('credential');
  await knex.schema.dropTableIfExists('person');
  await knex.schema.dropTableIfExists('event');
}
