import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableIfNotExists('request', (table) => {
    table.string('id').primary();
    table.string('code').notNullable().unique();
    table.text('schema_id').defaultTo('drivers_license');
    table.string('subject_did').notNullable();
    table.string('document_url');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table
      .enu('status', ['pending', 'approved', 'rejected'])
      .notNullable()
      .defaultTo('pending');
  });

  await knex.schema.createTableIfNotExists('api_keys', (table) => {
    table.string('id').primary();
    table.string('encrypted_key').notNullable().unique();
    table.string('hashed_key').notNullable().unique();
    table.string('hashed_pwd').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.string('description').notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('request');
  await knex.schema.dropTableIfExists('api_keys');

}
