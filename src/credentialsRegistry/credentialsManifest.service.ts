import { Inject, Injectable, Logger } from '@nestjs/common';
import { Knex } from 'knex';
import { retryOperation } from '../helpers/functions';

interface DidsCidsAssociation {
  holderDidUri: string;
  cids: string[];
}
export interface CredentialManifest {
  issuerDid: string;
  issuedCredentials?: DidsCidsAssociation[];
}

@Injectable()
export class CredentialsManifestService {
  constructor(@Inject('KnexConnection') private readonly knex: Knex) {}

  private readonly logger = new Logger(CredentialsManifestService.name);

  async updateManifest(
    credentialCid: string,
    holderDidUri: string,
    manifest: CredentialManifest,
  ): Promise<CredentialManifest> {
    try {
      const entry = manifest.issuedCredentials.find(
        (entry: any) => entry.holderDidUri === holderDidUri,
      );
      if (entry) {
        // Add the new CID to the existing array associated with the holder DID passed as a parameter
        entry.cids.push(credentialCid);
      } else {
        // Create a new entry for the holder DID URI if one does not already exist
        manifest.issuedCredentials.push({
          holderDidUri,
          cids: [credentialCid],
        });
      }
      this.logger.debug(
        `Credential with cid ${credentialCid} has been succesfully added to manifest as a credential issued to did: ${holderDidUri}`,
      );
      return manifest;
    } catch (error) {
      this.logger.error(
        `An error occurred while updating the issuer manifest to add the newly uploaded credential with CID: ${credentialCid} for the holder with DID URI: ${holderDidUri}`,
      );
      throw error;
    }
  }

  async createManifest(
    credentialCid: string,
    holderDidUri: string,
    issuerDid: string,
  ): Promise<CredentialManifest> {
    try {
      const manifest: CredentialManifest = {
        issuerDid,
        issuedCredentials: [
          {
            holderDidUri,
            cids: [credentialCid],
          },
        ],
      };

      this.logger.debug(
        `Credential manifest has been created and credential with cid ${credentialCid} has been succesfully added to manifest as a credential issued to did: ${holderDidUri}`,
      );
      return manifest;
    } catch (error) {
      this.logger.error(
        `An error occurred while updating the issuer manifest to add the newly uploaded credential with CID: ${credentialCid} for the holder with DID URI: ${holderDidUri}`,
      );
      throw error;
    }
  }

  async addManifestToDatabase(cid: string): Promise<void> {
    try {
      await retryOperation(async () => {
        await this.knex('manifests').insert({ cid: cid });
      }, this.logger);
      this.logger.debug(
        `The newly uploaded manifest with CID ${cid} has been successfully saved to the database.`,
      );
    } catch (error) {
      this.logger.error(
        `An error has occurred while trying to add new manifest with CID ${cid} to database`,
        error.stack,
      );
      throw error;
    }
  }

  async getCurrentManifest(): Promise<string | null> {
    try {
      const result = await this.knex('manifests')
        .select('cid')
        .orderBy('created_at', 'desc')
        .first();

      if (!result) {
        this.logger.debug(`No manifest was found.`);
        return null;
      } else {
        this.logger.debug(
          `Manifest with CID ${result.cid} has been found as the current manifest.`,
        );
        return result.cid;
      }
    } catch (error) {
      this.logger.error(
        `An error has occurred while trying to get the current manifest.`,
        error.stack,
      );
      throw error;
    }
  }
}
