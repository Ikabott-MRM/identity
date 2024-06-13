import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableIfNotExists('request', (table) => {
    table.string('id').primary();
    table.text('schema_id').defaultTo('drivers_license');
    table.string('subject_did').notNullable();
    table.string('document_url');
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
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('request');
  await knex.schema.dropTableIfExists('credential_offer');
  await knex.schema.dropTableIfExists('credential');
}
