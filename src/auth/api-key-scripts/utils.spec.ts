import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import * as utils from './utils';
import Knex from 'knex';
describe('utils functions', () => {
  let knex: Knex.Knex<any, unknown[]>;

  beforeAll(async () => {
    // Set up in-memory SQLite for testing
    knex = Knex({
      client: 'sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
    });

    await knex.schema.createTableIfNotExists('api_keys', table => {
      table.string('id').primary();
      table.string('encrypted_key').notNullable().unique();
      table.string('hashed_key').notNullable().unique();
      table.string('hashed_pwd').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.string('description').notNullable();
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    // Clear the api_keys table before each test
    await knex('api_keys').del();
  });

  afterAll(async () => {
    await knex.destroy();
  });

  describe('validate password', () => {
    it('should return true if no API key is found', async () => {
      const apiKeyRows = await knex('api_keys').select('*');
      const result = await utils.validatePassword('password', knex);
      expect(apiKeyRows.length).toBe(0);
      expect(result).toBe(true);
    });

    it('should return true if password matches', async () => {
      const api_key_data = {
        id: crypto.randomUUID(),
        description: 'test',
        hashed_pwd: 'hashedPassword',
        encrypted_key: `iv-salt-encryptedKey`,
        hashed_key: 'hashedKey',
      };

      await knex('api_keys').insert(api_key_data);

      const bcryptCompare = jest.spyOn(bcrypt, 'compare') as jest.Mock;
      bcryptCompare.mockResolvedValue(true);

      const result = await utils.validatePassword('password', knex);
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedPassword');
    });

    it('should return false if password does not match', async () => {
      const api_key_data = {
        id: crypto.randomUUID(),
        description: 'test',
        hashed_pwd: 'hashedPassword',
        encrypted_key: `iv-salt-encryptedKey`,
        hashed_key: 'hashedKey',
      };

      await knex('api_keys').insert(api_key_data);

      const bcryptCompare = jest.spyOn(bcrypt, 'compare') as jest.Mock;
      bcryptCompare.mockResolvedValue(false);

      const result = await utils.validatePassword('password', knex);
      expect(result).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedPassword');
    });

    it('should handle errors gracefully', async () => {
      const api_key_data = {
        id: crypto.randomUUID(),
        description: 'test',
        hashed_pwd: 'hashedPassword',
        encrypted_key: `iv-salt-encryptedKey`,
        hashed_key: 'hashedKey',
      };

      await knex('api_keys').insert(api_key_data);
      const bcryptCompare = jest.spyOn(bcrypt, 'compare') as jest.Mock;
      bcryptCompare.mockRejectedValue(new Error('Something went wrong'));

      const result = await utils.validatePassword('password', knex);
      expect(result).toBeUndefined();
    });
  });

  describe('decrypt ApiKey', () => {
    it('should decrypt the API key correctly', () => {
      const password = 'password';
      const iv = crypto.randomBytes(16);
      const salt = crypto.randomBytes(16).toString('hex');
      const key = crypto.scryptSync(password, salt, 32);
      const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
      let encrypted = cipher.update('apiKey', 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const decryptedApiKey = utils.decryptApiKey(
        encrypted,
        password,
        iv.toString('hex'),
        salt,
      );

      expect(decryptedApiKey).toBe('apiKey');
    });

    it('should throw an error if decryption fails', () => {
      const encryptedApiKey = 'invalid_api_key';
      const password = 'password';
      const iv = 'invalid_iv';
      const salt = 'invalid_salt';

      expect(() =>
        utils.decryptApiKey(encryptedApiKey, password, iv, salt),
      ).toThrow();
    });
  });

  describe('generate ApiKey', () => {
    it('should generate a 32-character API key', () => {
      const apiKey = utils.generateApiKey();
      expect(apiKey).toHaveLength(32);
      expect(typeof apiKey).toBe('string');
    });
  });

  describe('save apiKey', () => {
    // beforeEach(() => {
    //   jest.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.from('random_bytes'));
    //   jest.spyOn(crypto, 'scryptSync').mockReturnValue(Buffer.from('scrypt_key'));
    // });

    it('should save a new API key', async () => {
      const description = 'test';
      const password = 'password';
      const apiKey = 'api_key';

      const bcryptHash = jest.spyOn(bcrypt, 'hash') as jest.Mock;
      bcryptHash.mockResolvedValue('hashed_value');

      // Knex first() return null (no existing API key)
      let apiKeyRows = await knex('api_keys').select('*');
      expect(apiKeyRows.length).toBe(0);

      await utils.saveApiKey(description, password, apiKey, knex);

      apiKeyRows = await knex('api_keys').select('*');
      expect(apiKeyRows.length).toBe(1);
      expect(apiKeyRows[0].hashed_key).toBe('hashed_value');
      expect(apiKeyRows[0].description).toBe('test');
    });

    it('should generate a new API key if it already exists', async () => {
      const api_key_data = {
        id: crypto.randomUUID(),
        description: 'test',
        hashed_pwd: 'hashedPassword',
        encrypted_key: `iv-salt-encryptedapikey`,
        hashed_key: 'hashedKey',
      };

      await knex('api_keys').insert(api_key_data);

      let apiKeyRows = await knex('api_keys').select('*');
      expect(apiKeyRows.length).toBe(1);

      jest.spyOn(utils, 'encryptApiKey').mockResolvedValueOnce({
        iv: 'iv',
        salt: 'salt',
        encryptedApiKey: 'encryptedapikey',
      });

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_value');

      const description = 'test two';
      const password = 'password';
      const apiKey = 'api_key';

      await utils.saveApiKey(description, password, apiKey, knex);
    });
  });
});
