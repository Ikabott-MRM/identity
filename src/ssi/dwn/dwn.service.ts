import { Injectable, Logger } from '@nestjs/common';
import { Record, RecordsQueryResponse, Web5 } from '@web5/api';

import * as fs from 'fs';
import { VerifiableCredential } from '@web5/credentials';

export interface CredentialQueryResultObject {
  verifiableCredential: VerifiableCredential;
  vcJwt: string;
}

@Injectable()
export class DWNService {
  private readonly logger = new Logger(DWNService.name);
  private web5Instance: Web5;

  async onModuleInit() {
    try {
      if (!this.web5Instance) {
        const { web5, did } = await Web5.connect({
          sync: '30s',
        });
        this.logger.debug(
          `web5 agent has been intialized and connected to local dwn server`,
        );
        this.logger.debug(`DID author of records:`);
        this.logger.debug(did);
        this.web5Instance = web5;
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

      // protocol already exists
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
      this.logger.error('Error loading JSON file:', error);
    }
  }

  async saveCredentialtoDWN(
    holderDid: string,
    signedVc: string,
    credentialSchema: string,
  ): Promise<{
    success: boolean;
    result: Record | null;
    error: string | null;
  }> {
    try {
      if (!holderDid) throw new Error(`holderDid cannot be undefined.`);
      if (!signedVc) throw new Error(`signedVc cannot be undefined.`);
      if (!credentialSchema)
        throw new Error(`credentialSchema cannot be undefined.`);

      const res = await this.web5Instance.dwn.records.create({
        data: signedVc,
        message: {
          protocol: 'https://identity-iovf.xyz',
          protocolPath: 'driversLicense',
          schema: credentialSchema,
          dataFormat: 'application/vc+jwt',
          recipient: holderDid,
        },
      });
      if (res.status.code === 202 && res.record) {
        this.logger.debug(
          `Credential has been successfully written to DWN node`,
        );
        return {
          success: true,
          result: res.record,
          error: null,
        };
      } else {
        this.logger.debug(
          `Credential has not been written to DWN node. Detail: ${res.status.detail}`,
        );
        return {
          success: false,
          result: null,
          error: res.status.detail,
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

  async fetchAndParseCredentials(
    res: RecordsQueryResponse,
  ): Promise<CredentialQueryResultObject[]> {
    const credentialPromises = res.records.map(async record => {
      const encodedCredential = await record.data.text();
      const parsedCredential = VerifiableCredential.parseJwt({
        vcJwt: encodedCredential,
      });

      return {
        vcJwt: encodedCredential,
        verifiableCredential: parsedCredential,
      };
    });

    const credentialsResult = await Promise.all(credentialPromises);
    return credentialsResult;
  }

  async queryCredentialsFromDWN(holderDid: string): Promise<{
    success: boolean;
    result: CredentialQueryResultObject[] | null;
    error: string | null;
  }> {
    try {
      if (!holderDid) throw new Error(`holderDid cannot be undefined.`);

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

        const credentials = await this.fetchAndParseCredentials(res);

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
