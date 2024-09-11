import * as Knex from 'knex';
import config from '../../../knexfile';
import { validatePassword, generateApiKey, saveApiKey } from './utils';
const environment = process.env.NODE_ENV || 'development';
const knexConfig = config[environment];
const knex = Knex(knexConfig);

const run = async () => {
  try {
    const description = process.argv[2];
    if (!description) {
      throw new Error(`Please provide a description for the API key`);
    }

    const password = process.argv[3];
    const isPwdValid = await validatePassword(password, knex);
    if (!isPwdValid) {
      console.error(
        `The provided password does not match the encryption password for existing API keys. All API keys must be encrypted with the same password.`,
      );
      throw new Error(`Incorrect password.`);
    }
    const apiKey = generateApiKey();
    await saveApiKey(description, password, apiKey, knex);
  } catch (error) {
    console.error(`Error:`, error.message);
  } finally {
    await knex.destroy();
  }
};

run();
