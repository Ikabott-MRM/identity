import * as Knex from 'knex';
import config from '../../../knexfile';
import { validatePassword, decryptApiKey } from './utils';
import { table } from 'console';
const environment = process.env.NODE_ENV || 'development';
const knexConfig = config[environment];
const knex = Knex(knexConfig);

const run = async () => {
  try {
    const password = process.argv[2];
    if (!password) {
      throw new Error(`Please provide a password for decrypting the API keys`);
    }
    const isPwdValid = await validatePassword(password, knex);
    if (!isPwdValid) {
      console.error(
        `The provided password does not match the encryption password for existing API keys.`,
      );
      throw new Error(`Incorrect password.`);
    }
    const apiKeysEntries = await knex('api_keys').select('*');

    if (!Boolean(apiKeysEntries.length)) {
      console.info(`There are currently no API keys available to list.`);
      return;
    }
    const tableData = apiKeysEntries.map(apiKeyEntry => {
      const [iv, salt, encryptedApiKey] = apiKeyEntry.encrypted_key.split('-');
      const decryptedKey = decryptApiKey(encryptedApiKey, password, iv, salt);

      return {
        ID: apiKeyEntry.id,
        Description: apiKeyEntry.description,
        DecryptedKey: decryptedKey,
      };
    });
    console.table(tableData);
  } catch (error) {
    console.error(`Error:`, error);
  } finally {
    await knex.destroy();
  }
};

run();
