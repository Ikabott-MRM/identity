import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Knex } from 'knex';

interface VerificationRequest {
  id?: string;
  schema_id: string;
  subject_did: string;
  document_url: string;
}

@Injectable()
export class VerificationService {
  constructor(@Inject('KnexConnection') private readonly knex: Knex) {}

  async createRequest(request: VerificationRequest) {
    const uuid = randomUUID();
    const data = {
      id: request.id ?? uuid,
      schema_id: request.schema_id,
      subject_did: request.subject_did,
      document_url: request.document_url,
    };

    // await this.knex.insert(data).into('request');

    return data;
  }
}
