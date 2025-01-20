import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Knex } from 'knex';
import { IssuerAgentService } from '../ssi/issuerAgent.service';

@Injectable()
export class CredentialsManifestService {
  constructor(
    @Inject('KnexConnection') private readonly knex: Knex,
    private readonly issuerService: IssuerAgentService,
  ) {}

  private readonly logger = new Logger(CredentialsManifestService.name);
}
