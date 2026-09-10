import type { Knex } from 'knex';

/**
 * Singleton row storing the bcrypt hash of the Verifier "código de empresa".
 * Plaintext is never persisted.
 */
export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('verifier_company_settings');
  if (!hasTable) {
    await knex.schema.createTable('verifier_company_settings', (table) => {
      table.increments('id').primary();
      table.string('hashed_code', 255).notNullable();
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('verifier_company_settings');
}
