/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable('verifier_company_settings');
  if (!hasTable) {
    await knex.schema.createTable('verifier_company_settings', (table) => {
      table.increments('id').primary();
      table.string('hashed_code', 255).notNullable();
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('verifier_company_settings');
};
