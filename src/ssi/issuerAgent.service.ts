import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BearerDid, DidDht } from '@web5/dids';
import { VerifiableCredential, PresentationExchange } from '@web5/credentials';
import { CredentialsSchemasInMemoryRepository } from './inMemoryRepositories/credentialsSchemas-in-memory';
import { mapDataWithRules } from '../helpers/functions';
import { PresentationsDefinitions } from './inMemoryRepositories/presentations-definitions-in-memory';
import { DWNService } from './dwn/dwn.service';
import { AUTHORIZED_CALLER_TOKEN } from './dwn/authorized-caller.provider';
import { Jwk } from '@web5/crypto';

@Injectable()
export class IssuerAgentService implements OnModuleInit {
  private readonly logger = new Logger(IssuerAgentService.name);
  private operationalDID: BearerDid | null = null;

  constructor(
    private readonly credentialsRepository: CredentialsSchemasInMemoryRepository,
    private readonly presentationsDefinitions: PresentationsDefinitions,
    private readonly dwnService: DWNService,
    @Inject(AUTHORIZED_CALLER_TOKEN) private readonly dwnServiceToken: symbol,
  ) {}

  async onModuleInit() {
    // Check if DID already exists
    if (!this.operationalDID) {
      this.logger.debug(`issuer agent getting initialized:`);

      this.operationalDID = (await this.createAndExportTBDIdentity()).result;

      this.logger.debug(`operational DID of agent:`);
      this.logger.debug(this.operationalDID.uri);
    }
  }

  /**
   * @returns a new DID using the `did:dht` method formed from a newly generated key.
   * by default a new Ed25519 key will be generated which serves as the Identity Key.
   */
  async createAndExportTBDIdentity(): Promise<{
    success: boolean;
    result: BearerDid | null;
    error: string | null;
  }> {
    try {
      // Creates a DID using the DHT method and publishes the DID Document to the DHT
      this.logger.log(`A dht did is about to be created`);
      const didDht = await DidDht.create();
      this.logger.log(`A dht did has been succesfully created`);

      const portableDid = await didDht.export();
      /**
       * TODO se haria el save del exported did. se va a confirmar storage
       */
      return {
        success: true,
        result: didDht,
        error: null,
      };
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to create a DID`,
        error.stack,
      );
      return { success: false, result: null, error: error.message };
    }
  }

  /**
   * @param data data that is going to be used to form the credential claims
   * @param expDate expiration date that is going to be used for setting the expiration of the jwt
   * @param schemaId id of the schema associated to the credential that is going to be offered where mapping rules and credential properties are defined
   * @param subjectDid DID of the entity that the credential is being issued to
   * @returns A VC JWT; a secure URL-safe string representation of a credential, ideal for storage or transmission between two parties
   */
  async issueCredential(
    data: any,
    expDate: string,
    schemaId: string,
    subjectDid: string,
  ): Promise<{
    success: boolean;
    result: string | null;
    error: string | null;
  }> {
    try {
      const schema = await this.credentialsRepository.get(schemaId);
      const mappedData = mapDataWithRules(data, schema.mappingRulesDescriptor);
      let expirationISOString: string;
      let credentialData: {
        type: string[];
        data: any;
        expirationDate?: string;
      } = {
        type: schema.type,
        data: mappedData,
      };

      if (Boolean(expDate)) {
        const expirationDate = new Date(expDate);
        expirationISOString = expirationDate.toISOString();
        credentialData.expirationDate = expirationISOString;
      }
      this.logger.debug(`credential is being created`);
      const vc = await VerifiableCredential.create({
        type: credentialData.type,
        issuer: this.operationalDID.uri,
        subject: subjectDid,
        data: credentialData.data,
        expirationDate: credentialData.expirationDate,
      });

      this.logger.debug(`credential is being signed`);
      const signedVcJwt = await vc.sign({ did: this.operationalDID });
      this.logger.debug(`credential has been successfully signed`);

      const saveResult = await this.dwnService.saveCredentialtoDWN(
        subjectDid,
        signedVcJwt,
        credentialData.type[0],
      );

      if (!saveResult.success) {
        throw new Error(
          saveResult.error ||
            `An error occurred while saving the credential to DWN`,
        );
      }

      return {
        success: true,
        result: signedVcJwt,
        error: null,
      };
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to issue a Verifiable credential for ${subjectDid}`,
        error.stack,
      );
      return { success: false, result: null, error: error.message };
    }
  }

  /**
   *
   * @returns issuer's public key in JWK format
   */
  async getIssuerPublicJWKey(): Promise<{
    success: boolean;
    result: Jwk | null;
    error: string | null;
  }> {
    try {
      if (!this.operationalDID.document.verificationMethod)
        throw new Error(
          `There is no verification method in the issuer's did document`,
        );

      const issuerPubKey =
        this.operationalDID.document.verificationMethod[0].publicKeyJwk;

      if (!issuerPubKey)
        throw new Error(
          `No JSON Web Key was obtained from the verification method in the issuer's did document`,
        );
      if (issuerPubKey)
        return {
          success: true,
          result: issuerPubKey,
          error: null,
        };
    } catch (error) {
      this.logger.error(
        `An error occurred while retrieving the issuer public JSON web key from the verification method in its did document`,
        error.stack,
      );
      return { success: false, result: null, error: error.message };
    }
  }
}
