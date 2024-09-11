import { Test, TestingModule } from '@nestjs/testing';
import { Knex } from 'knex';
import { ApiKeysService } from './api-keys.service';
import { Logger } from '@nestjs/common';

describe('ApiKeysService - Integration Tests', () => {
  let loggerErrorSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;
  let service: ApiKeysService;
  let knex: Knex;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        {
          provide: 'KnexConnection',
          useFactory: () => {
            return require('knex')({
              client: 'sqlite3',
              connection: ':memory:',
              useNullAsDefault: true,
            });
          },
        },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
    knex = module.get<Knex>('KnexConnection');
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log');
    // Create the api_keys table
    await knex.schema.createTableIfNotExists('api_keys', table => {
      table.string('id').primary();
      table.string('encrypted_key').notNullable().unique();
      table.string('hashed_key').notNullable().unique();
      table.string('hashed_pwd').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.string('description').notNullable();
    });
  });

  afterAll(async () => {
    await knex.destroy();
  });

  beforeEach(async () => {
    // Clear the api_keys table before each test
    await knex('api_keys').del();
  });

  it('should return all api-keys hashes', async () => {
    // Create multiple api-keys entries
    const api_key_data = {
      id: crypto.randomUUID(),
      description: 'test',
      hashed_pwd: 'hashedPassword',
      encrypted_key: `iv-salt-encryptedKey`,
      hashed_key: 'hashedKey',
    };

    const api_key_data_2 = {
      id: crypto.randomUUID(),
      description: 'test',
      hashed_pwd: 'hashedPassword',
      encrypted_key: `iv-salt-encryptedKey2`,
      hashed_key: 'hashedKey2',
    };

    await knex('api_keys').insert(api_key_data);
    await knex('api_keys').insert(api_key_data_2);

    const hashedApiKeys = await service.getHashedApiKeys();

    expect(loggerLogSpy).toHaveBeenCalledWith(
      `There are ${hashedApiKeys.length} active api-keys.`,
    );
    expect(hashedApiKeys).toHaveLength(2);
    expect(hashedApiKeys[0]).toBe(api_key_data.hashed_key);
    expect(hashedApiKeys[1]).toBe(api_key_data_2.hashed_key);
  });
});
