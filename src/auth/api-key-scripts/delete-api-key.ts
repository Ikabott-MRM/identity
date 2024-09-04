import * as Knex from 'knex';
import config from '../../../knexfile';
import { validatePassword, decryptApiKey } from './utils';
const environment = process.env.NODE_ENV || 'development';
const knexConfig = config[environment];
const knex = Knex(knexConfig);

const run = async () => {
  try {
    const password = process.argv[2];

    if (!password) {
      throw new Error(
        `Please provide a password for decrypting the API intended to be deleted.`,
      );
    }
    const isPwdValid = await validatePassword(password, knex);
    if (!isPwdValid) {
      console.error(
        `The provided password does not match the encryption password for existing API keys.`,
      );
      throw new Error(`Incorrect password.`);
    }

    if (process.argv[3].startsWith('--desc')) {
      const descriptionToDelete = process.argv[3].split('=')[1];
      const deletedRows = await knex('api_keys')
        .where({ description: descriptionToDelete })
        .del();
      console.info(
        `${deletedRows} ${deletedRows > 1 ? `api-keys` : `api-key`} associated to description ${descriptionToDelete} ${deletedRows > 1 ? `have` : `has`} been deleted`,
      );
      return;
    } else if (process.argv[3].startsWith('--keys')) {
      const keysString = process.argv[3].split('=')[1].slice(1, -1);
      let keysToDelete: string[] = keysString.split(',');
      const apiKeysEntries = await knex('api_keys').select('*');
      if (!Boolean(apiKeysEntries.length)) {
        console.info(`There are currently no API keys to delete.`);
        return;
      }

      for (const apiKeyEntry of apiKeysEntries) {
        const [iv, salt, encryptedApiKey] =
          apiKeyEntry.encrypted_key.split('-');
        const decryptedKey = decryptApiKey(encryptedApiKey, password, iv, salt);
        if (keysToDelete.includes(decryptedKey)) {
          await knex('api_keys')
            .where({ encrypted_key: apiKeyEntry.encrypted_key })
            .del();
          const indexOfKeyToDelete = keysToDelete.indexOf(decryptedKey);
          keysToDelete = keysToDelete.splice(indexOfKeyToDelete, 1);
          console.info(`Api-key ${decryptedKey} has been deleted.`);
        }
      }
    }
  } catch (error) {
    console.error(`Error:`, error);
  } finally {
    await knex.destroy();
  }
};

run();
