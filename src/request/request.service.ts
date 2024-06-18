import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { randomUUID } from 'crypto';
import { Knex } from 'knex';
import { IssuerAgentService } from '../ssi/issuerAgent.service';

interface VerificationRequest {
  id?: string;
  schema_id: string;
  subject_did: string;
  document_url: string;
}

export interface IdentifiableData {
  firstname: string;
  lastname: string;
  licensecategory: string;
}

// write requestalreadyprocessed error
export class RequestAlreadyProcessedError extends Error {
  constructor() {
    super('Request already processed');
  }
}

@Injectable()
export class RequestService {
  constructor(
    @Inject('KnexConnection') private readonly knex: Knex,
    private readonly issuerService: IssuerAgentService,
  ) {}

  private readonly logger = new Logger(RequestService.name);

  async createRequest(request: VerificationRequest) {
    const uuid = randomUUID();
    const data = {
      id: request.id ?? uuid,
      schema_id: request.schema_id,
      subject_did: request.subject_did,
      document_url: request.document_url,
    };

    await this.knex.insert(data).into('request');

    return data;
  }

  async getRequests() {
    return this.knex.select('*').from('request');
  }

  async approveRequest(id: string, identifiable_data: IdentifiableData) {
    const tx = await this.knex.transaction();

    const request = await tx('request').where({ id: id }).first();

    if (!request) {
      this.logger.debug('Request not found');
      await tx.rollback();
      throw new NotFoundException('Request not found');
    }

    if (request.status !== 'pending') {
      this.logger.debug('Request already processed');
      await tx.rollback();
      throw new RequestAlreadyProcessedError();
    }

    const subject_did = request.subject_did;

    const issuance = await this.issuerService.issueCredential(
      identifiable_data,
      'DriversLicense',
      subject_did,
    );

    if (!issuance.success) {
      this.logger.debug(issuance.error);
      await tx.rollback();
      throw new Error(issuance.error);
    }

    await tx('request').where({ id: id }).update({ status: 'approved' });

    await tx.commit();

    return {
      ...request,
      status: 'approved',
    };
  }

  async rejectRequest(id: string) {
    await this.knex('request').where({ id: id }).update({ status: 'rejected' });

    return { status: 'rejected' };
  }
}
