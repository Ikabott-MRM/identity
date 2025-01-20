import { Inject, Injectable, Logger } from '@nestjs/common';
import { Knex } from 'knex';
import { IssuerAgentService } from '../ssi/issuerAgent.service';

@Injectable()
export class didCidsAssociationService {
  constructor(
    @Inject('KnexConnection') private readonly knex: Knex,
    private readonly issuerService: IssuerAgentService,
  ) {}

  private readonly logger = new Logger(didCidsAssociationService.name);

  async addCidToDid(cid: string, didUri: string): Promise<void> {
    //TODO agregar aca loggear que se agrego X cid asociado a Z did con exito
    await this.knex('did_cids').insert({ cid: cid, didUri: didUri });
  }

  async getCidsByDid(didUri: string): Promise<string[]> {
    //TODO agregar que si no hay ninguno loggear eso
    const results = await this.knex('did_cids')
      .select('CID')
      .where('didUri', didUri);

    return results.map(row => row.CID);
  }
}
