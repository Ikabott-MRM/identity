import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableIfNotExists('web3_manifest_outbox', (table) => {
    table.string('id').primary();
    table.string('didUri').notNullable();
    table.string('didKey', 66).notNullable(); // bytes32 as hex (0x + 64 chars)
    table.string('manifestCid').notNullable();
    table
      .enu('status', ['pending', 'sent', 'confirmed', 'failed'])
      .notNullable()
      .defaultTo('pending');
    table.string('txHash').nullable();
    table.integer('attempts').notNullable().defaultTo(0);
    table.text('lastError').nullable();
    table.timestamp('nextAttemptAt').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index('status', 'idx_web3_outbox_status');
    table.index('nextAttemptAt', 'idx_web3_outbox_next_attempt');
    table.index('didKey', 'idx_web3_outbox_did_key');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('web3_manifest_outbox');
}


