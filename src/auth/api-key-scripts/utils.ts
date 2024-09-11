import * as bcrypt from 'bcrypt';
import * as Knex from 'knex';
import * as crypto from 'crypto';

export const validatePassword = async (
  password: string,
  knex: Knex.Knex<any, unknown[]>,
) => {
  try {
    const apiKeyRow = await knex('api_keys').select('*').first();
    if (!apiKeyRow) return true;
    const hashed_pwd = apiKeyRow.hashed_pwd;
    return await bcrypt.compare(password, hashed_pwd);
  } catch (error) {
    console.error(`Falla el validate password`, error);
  }
};

export const decryptApiKey = (
  encryptedApiKey: string,
  password: string,
  iv: string,
  salt: string,
) => {
  try {
    const key = crypto.scryptSync(password, salt, 32);
    const decipher = crypto.createDecipheriv(
      'aes-256-ctr',
      key,
      Buffer.from(iv, 'hex'),
    );
    let decrypted = decipher.update(encryptedApiKey, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error(
      `An error occured while decrypting an api key`,
      error.message,
    );
    throw error;
  }
};

export const generateApiKey = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

export const encryptApiKey = async (
  password: string,
  apiKey: string,
): Promise<{ iv: string; salt: string; encryptedApiKey: string }> => {
  try {
    const iv = crypto.randomBytes(16);
    const salt = crypto.randomBytes(16).toString('hex');
    const key = crypto.scryptSync(password, salt, 32);
    const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      iv: iv.toString('hex'),
      salt: salt,
      encryptedApiKey: encrypted,
    };
  } catch (error) {
    console.error(
      `An error occurred while trying to encrypt an api-key`,
      error,
    );
    throw error;
  }
};

export const saveApiKey = async (
  description: string,
  password: string,
  apiKey: string,
  knex: Knex.Knex<any, unknown[]>,
) => {
  try {
    const { iv, salt, encryptedApiKey } = await encryptApiKey(password, apiKey);
    const encrypted_key = `${iv}-${salt}-${encryptedApiKey}`;
    const apikeyAlreadyExists = await knex('api_keys')
      .where({ encrypted_key: encrypted_key })
      .first();

    if (apikeyAlreadyExists) {
      const apiKey = generateApiKey();
      return saveApiKey(description, password, apiKey, knex);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedKey = await bcrypt.hash(apiKey, 10);

    const newApiKey = {
      id: crypto.randomUUID(),
      description,
      hashed_pwd: hashedPassword,
      encrypted_key: encrypted_key,
      hashed_key: hashedKey,
    };

    await knex('api_keys').insert(newApiKey);
    console.info(`API Key saved successfully with description:`, description);
  } catch (error) {
    console.error(`An error occurred while trying to save an api-key`, error);
    throw error;
  }
};
