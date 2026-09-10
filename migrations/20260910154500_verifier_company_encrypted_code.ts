import type { Knex } from 'knex';

/**
 * Stores AES-256-GCM ciphertext of the Verifier company code so Emisor can
 * display it (eye toggle). bcrypt hashed_code remains the source of truth
 * for session verify. Key: DOCUMENT_URL_SIGNING_SECRET (SHA-256 derived).
 * Ciphertext format: v1:<iv_b64>:<tag_b64>:<ciphertext_b64>
 */
export async function up(knex: Knex): Promise<void> {
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
}

export async function down(knex: Knex): Promise<void> {
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
}
