/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable('verifier_company_settings');
  if (!hasTable) {
    return;
  }
  const hasCol = await knex.schema.hasColumn(
    'verifier_company_settings',
    'encrypted_code',
  );
  if (!hasCol) {
    await knex.schema.alterTable('verifier_company_settings', (table) => {
      table.text('encrypted_code').nullable();
    });
  }
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  const hasTable = await knex.schema.hasTable('verifier_company_settings');
  if (!hasTable) {
    return;
  }
  const hasCol = await knex.schema.hasColumn(
    'verifier_company_settings',
    'encrypted_code',
  );
  if (hasCol) {
    await knex.schema.alterTable('verifier_company_settings', (table) => {
      table.dropColumn('encrypted_code');
    });
  }
};
