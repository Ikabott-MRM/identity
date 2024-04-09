import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { v4 } from 'uuid';

@Injectable()
export class MembersService {
  constructor(@Inject('KnexConnection') private readonly knex: Knex) {}

  async findByEmail(email: string) {
    return this.knex('members').where({ email }).first();
  }

  async sendVerificationCode(email: string) {
    const code = v4();
    return this.knex('verification_code').insert({ email, code });
  }

  async isCodeValid(email: string, code: string) {
    const verificationCode = await this.knex('verification_code')
      .where({ email, code })
      .first();

    if (!verificationCode) {
      return false;
    }

    return true;
  }

  async createMember(email: string, name: string) {
    const dbResponse = await this.knex('member').insert({ email, name });
    const id = dbResponse[0];
    return { id, email, name };
  }
}
