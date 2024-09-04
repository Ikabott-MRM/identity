import * as Knex from 'knex';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import config from '../../../knexfile';
import { validatePassword } from './utils';
const environment = process.env.NODE_ENV || 'development';
const knexConfig = config[environment];
const knex = Knex(knexConfig);

const generateApiKey = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

const encryptApiKey = async (
  password: string,
  apiKey: string,
): Promise<{ iv: string; salt: string; encryptedApiKey: string }> => {
  const iv = crypto.randomBytes(16);
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.scryptSync(password, salt, 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    iv: iv.toString('hex'),
    salt: salt,
    encryptedApiKey: encrypted,
  };
};

const saveApiKey = async (
  description: string,
  password: string,
  apiKey: string,
) => {
  const { iv, salt, encryptedApiKey } = await encryptApiKey(password, apiKey);
  const encrypted_key = `${iv}-${salt}-${encryptedApiKey}`;
  const apikeyAlreadyExists = await knex('api_keys')
    .where({ encrypted_key: encrypted_key })
    .first();

  if (apikeyAlreadyExists) {
    const apiKey = generateApiKey();
    return saveApiKey(description, password, apiKey);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const hashedKey = await bcrypt.hash(password, 10);

  const newApiKey = {
    id: crypto.randomUUID(),
    description,
    hashed_pwd: hashedPassword,
    encrypted_key: encrypted_key,
    hashed_key: hashedKey,
  };

  await knex('api_keys').insert(newApiKey);
  console.info(`API Key saved successfully with description:`, description);
};

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
    await saveApiKey(description, password, apiKey);
  } catch (error) {
    console.error(`Error:`, error.message);
  } finally {
    await knex.destroy();
  }
};

run();
