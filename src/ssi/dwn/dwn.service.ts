import { Inject, Injectable, Logger } from '@nestjs/common';
import { Web5 } from '@web5/api';
import * as fs from 'fs';
import { AUTHORIZED_CALLER_TOKEN } from './authorized-caller.provider';
import { BearerDid } from '@web5/dids';
import { VerifiableCredential } from '@web5/credentials';

//IMPORTANTE Usar version node 20 o mas sino faltan imports

@Injectable()
export class DWNService {
  private readonly logger = new Logger(DWNService.name);
  private web5Instance: Web5;

  //TODO solo par probar protocolo
  //   private web51;
  //   private web52;

  constructor(
    @Inject(AUTHORIZED_CALLER_TOKEN)
    private readonly authorizedCallerToken: symbol,
  ) {}

  async onModuleInit() {
    try {
      if (!this.web5Instance) {
        const { web5, did: DWNAgentDidUri } = await Web5.connect({
          sync: '30s',
        });
        this.logger.debug(
          `web5 agent has been intialized and connected to local dwn server`,
        );
        this.logger.debug(`DID of dwn agent:`);
        this.logger.debug(DWNAgentDidUri);

        //TODO si uso eso como did del issuer agent, tengo que firmar con esto:
        //tendria que exportar y guardar este did. A definir donde guardarlo
        //solo tendria que crear uno nuevo si no tengo uno, sino tengo que usar
        // crear el web5UserAgent, importar el did como agent-managed identity e inicializar
        //web5 api con el user Agent y el Did en vez de con web5.connect
        // ver file de apuntes
        const dwnAgentDid = web5.agent.agentDid.export();
        this.web5Instance = web5;

        // const { web5:web51, did: DidUri1 } = await Web5.connect({
        //     sync: '30s',
        //   });
        //   this.web51 = web51
        //   this.logger.debug(`DID 1:`);
        //   this.logger.debug(DidUri1);

        //   const { web5:web52, did: DidUri2 } = await Web5.connect({
        //     sync: '30s',
        //   });
        //   this.web52 = web52;
        //   this.logger.debug(`DID 2:`);
        //   this.logger.debug(DidUri2);
      }

      await this.importAndConfigureProtocol();
    } catch (error) {
      this.logger.error(
        `An error occurred while initializing dwn agent`,
        error,
      );
    }
  }

  async importAndConfigureProtocol() {
    try {
      const rawData = fs.readFileSync('src/ssi/dwn/credentials-protocol.json');
      const credProtocol = JSON.parse(rawData.toString());

      // query the list of existing protocols on the DWN
      const { protocols, status } = await this.web5Instance.dwn.protocols.query(
        {
          message: {
            filter: {
              protocol: 'https://identity-iovf.xyz',
            },
          },
        },
      );

      if (status.code !== 200) {
        this.logger.error('Error querying protocols', status);
        return;
      }

      // if the protocol already exists, we return
      if (protocols.length > 0) {
        this.logger.log('Protocol already exists');
        return;
      }

      // configure protocol on local DWN
      const { status: configureStatus, protocol } =
        await this.web5Instance.dwn.protocols.configure({
          message: {
            definition: credProtocol,
          },
        });

      this.logger.log('Protocol configured', configureStatus, protocol);
    } catch (error) {
      console.error('Error loading JSON file:', error);
    }
  }

  async getDWNAgentDid(callerToken: symbol): Promise<BearerDid> {
    if (callerToken === this.authorizedCallerToken) {
      return this.web5Instance.agent.agentDid;
    }
    throw new Error('Unauthorized access. Cannot access to dwn agent did');
  }

  async saveCredentialtoDWN(
    holderDid: string,
    signedVc: string,
    credentialSchema: string,
  ): Promise<{
    success: boolean;
    result: string | null;
    error: string | null;
  }> {
    try {
      const { record } = await this.web5Instance.dwn.records.create({
        data: signedVc,
        message: {
          protocol: 'https://identity-iovf.xyz',
          protocolPath: 'invitation',
          schema: credentialSchema,
          dataFormat: 'application/vc+jwt',
          recipient: holderDid,
        },
      });
      if (record) {
        this.logger.debug(
          `Credential has been successfully written to DWN node`,
        );
        return {
          success: true,
          result: 'definir que retornar',
          error: null,
        };
      } else {
        this.logger.debug(`Credential has not been written to DWN node`);
        return {
          success: false,
          result: 'definir que retornar',
          error: null,
        };
      }
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to save credential for holder ${holderDid} to DWN node`,
        error,
      );
      return { success: false, result: null, error: error.message };
    }
  }

  async queryCredentialsFromDWN(holderDid: string): Promise<{
    success: boolean;
    result: VerifiableCredential[] | null;
    error: string | null;
  }> {
    try {
      const res = await this.web5Instance.dwn.records.query({
        message: {
          filter: {
            protocol: 'https://identity-iovf.xyz',
            recipient: holderDid,
          },
        },
      });
      if (res.status.code === 200) {
        this.logger.log(
          `credentials with holder ${holderDid} have been successfully retrieved `,
        );
        const credentialPromises = res.records.map(async (record) => {
          const encodedCredential = await record.data.text();
          return VerifiableCredential.parseJwt({ vcJwt: encodedCredential });
        });

        const credentials = await Promise.all(credentialPromises);

        return {
          success: true,
          result: credentials,
          error: null,
        };
      } else {
        this.logger.error(
          `An error occurred while trying to query credentials of holder ${holderDid} from DWN node`,
          res.status.detail,
        );
        return {
          success: false,
          result: null,
          error: res.status.detail,
        };
      }
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to query credentials of holder ${holderDid} from DWN node`,
        error,
      );
      return { success: false, result: null, error: error.message };
    }
  }
}
