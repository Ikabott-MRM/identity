import type { Knex } from 'knex';
import { randomUUID } from 'crypto';

export async function up(knex: Knex): Promise<void> {
  const hasChallenges = await knex.schema.hasTable('did_auth_challenges');
  if (!hasChallenges) {
    await knex.schema.createTable('did_auth_challenges', (table) => {
      table.string('id').primary();
      table.string('did').notNullable();
      table.string('nonce').notNullable();
      table.text('message').notNullable();
      table.timestamp('expires_at').notNullable();
      table.timestamp('used_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index('did', 'idx_did_auth_challenges_did');
    });
  }

  const hasDocumentId = await knex.schema.hasColumn('request', 'document_id');
  if (!hasDocumentId) {
    await knex.schema.alterTable('request', (table) => {
      table.string('document_id').nullable().unique();
    });
  }

  const rows = await knex('request').whereNull('document_id').select('id');
  for (const row of rows) {
    await knex('request').where({ id: row.id }).update({ document_id: randomUUID() });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('did_auth_challenges');
  const hasDocumentId = await knex.schema.hasColumn('request', 'document_id');
  if (hasDocumentId) {
    await knex.schema.alterTable('request', (table) => {
      table.dropUnique(['document_id']);
      table.dropColumn('document_id');
    });
  }
}
