import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableIfNotExists('request', (table) => {
    table.string('id').primary();
    table.text('schema_id').defaultTo('drivers_license');
    table.string('subject_did').notNullable();
    table.string('document_url');
    table
      .enu('status', ['pending', 'approved', 'rejected'])
      .notNullable()
      .defaultTo('pending');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('request');
}
