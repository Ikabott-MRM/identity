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
      'aes-256-cbc',
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
