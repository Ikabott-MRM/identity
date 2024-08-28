import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Knex } from 'knex';
import { IssuerAgentService } from '../ssi/issuerAgent.service';

export interface RequestFilter {
  status?: RequestStatus;
  schema_id?: string;
  subject_did?: string;
}

export interface VerificationRequest {
  id?: string;
  schema_id: string;
  subject_did: string;
  document_url: string;
}

export interface IdentifiableData {
  name: string;
  lastname: string;
  category: string;
}

export class RequestAlreadyProcessedError extends Error {
  constructor() {
    super('Request already processed');
  }
}

export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Injectable()
export class RequestService {
  constructor(
    @Inject('KnexConnection') private readonly knex: Knex,
    private readonly issuerService: IssuerAgentService,
  ) {}

  private readonly logger = new Logger(RequestService.name);

  async createRequest(request: VerificationRequest) {
    const code = Math.random().toString(36).substring(6);
    const exists = await this.knex('request').where({ code }).first();
    if (exists) {
      return this.createRequest(request);
    }
    const uuid = randomUUID();

    const data = {
      id: request.id ?? uuid,
      code,
      schema_id: request.schema_id,
      subject_did: request.subject_did,
      document_url: request.document_url,
    };

    await this.knex.insert(data).into('request');

    const createdRequest = await this.knex('request')
      .where({ id: data.id })
      .first();

    this.logger.debug(
      `Request with id ${uuid} has been successfully created and saved to db.`,
    );

    return createdRequest;
  }

  async getRequests(filter: RequestFilter = {}) {
    let query = this.knex.select('*').from('request');

    if (filter.status) {
      query = query.where('status', filter.status);
    }

    if (filter.schema_id) {
      query = query.where('schema_id', filter.schema_id);
    }

    if (filter.subject_did) {
      query = query.where('subject_did', filter.subject_did);
    }

    return query;
  }

  async getRequestsWithStatus(status: RequestStatus) {
    return this.knex.select('*').from('request').where({ status });
  }

  async getRequestsForSubject(subject_did: string) {
    return this.knex.select('*').from('request').where({ subject_did });
  }

  async getRequestAndValidate(tx: Knex.Transaction, id: string): Promise<any> {
    const request = await tx('request').where({ id }).first();
    if (!request) {
      this.logger.debug(`Request with id ${id} not found.`);
      throw new NotFoundException('Request not found.');
    }
    if (request.status !== RequestStatus.PENDING) {
      this.logger.debug(`Request with id ${id} already processed.`);
      throw new RequestAlreadyProcessedError();
    }
    return { request };
  }

  async deleteRequestsForSubject(subject_did: string) {
    return this.knex('request')
      .where({ subject_did, status: RequestStatus.PENDING })
      .del();
  }

  async approveRequest(
    id: string,
    identifiable_data: IdentifiableData,
    expDate: string,
  ) {
    const tx = await this.knex.transaction();

    try {
      const { request } = await this.getRequestAndValidate(tx, id);

      const subject_did = request.subject_did;
      const issuance = await this.issuerService.issueCredential(
        identifiable_data,
        expDate,
        'DriversLicense',
        subject_did,
      );
      if (!issuance.success) {
        this.logger.error(
          `An error occurred while trying to issue credential for request with id ${id}.`,
          issuance.error,
        );
        throw new Error(issuance.error);
      }
      await tx('request')
        .where({ id: id })
        .update({ status: RequestStatus.APPROVED });
      await tx.commit();
      this.logger.debug(
        `Request with id ${id} has been successfully approved.`,
      );
      return {
        ...request,
        status: RequestStatus.APPROVED,
      };
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to approve request with id ${id}.`,
        error.stack,
      );
      await tx.rollback();
      throw error;
    }
  }

  async rejectRequest(id: string) {
    const tx = await this.knex.transaction();

    try {
      await this.getRequestAndValidate(tx, id);

      await tx('request')
        .where({ id })
        .update({ status: RequestStatus.REJECTED });
      await tx.commit();
      this.logger.debug(
        `Request with id ${id} has been successfully rejected.`,
      );
      return { status: RequestStatus.REJECTED };
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to reject request with id ${id}.`,
        error.stack,
      );
      await tx.rollback();
      throw error;
    }
  }
}
