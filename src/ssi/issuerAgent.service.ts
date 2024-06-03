import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BearerDid, DidDht } from '@web5/dids';
import { VerifiableCredential, PresentationExchange } from '@web5/credentials';
import { CredentialsSchemasInMemoryRepository } from './inMemoryRepositories/credentialsSchemas-in-memory';
import { mapDataWithRules } from '../helpers/functions';
import { MemoryTempDataService } from './storage/storage.service';
import { PresentationsDefinitions } from './inMemoryRepositories/presentations-definitions-in-memory';
import { randomBytes } from 'crypto';
import { DWNService } from './dwn/dwn.service';
import { AUTHORIZED_CALLER_TOKEN } from './dwn/authorized-caller.provider';

@Injectable()
export class IssuerAgentService implements OnModuleInit {
  private readonly logger = new Logger(IssuerAgentService.name);
  private operationalDID: BearerDid | null = null;
  private vcDataModelsStorage: MemoryTempDataService =
    new MemoryTempDataService({ filepath: 'issuer-dataModels-storage.json' });

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
   * @param schemaId id of the schema associated to the credential that is going to be offered where mapping rules and credential properties are defined
   * @param data data that is going to be used to form the credential claims
   * @returns a JSON string that contains credential type, claims and its expiration date
   */
  async createCredentialOffer(
    schemaId: string,
    data: any,
  ): Promise<{
    success: boolean;
    result: { id: string; credentialOffer: string } | null;
    error: string | null;
  }> {
    try {
      const schema = await this.credentialsRepository.get(schemaId);
      const credentialData = mapDataWithRules(
        data,
        schema.mappingRulesDescriptor,
      );
      this.logger.log(`credentialDataMapped:`);
      let expirationISOString: string;

      this.logger.log(`credential offer is being created`);
      let vcDataPreview: {
        type: string[];
        data: any;
        expirationDate?: string;
      } = {
        type: schema.type,
        data: credentialData,
      };

      if (schema.type.includes('InvitationCredential')) {
        const expirationDate = new Date(data.startDate);
        expirationDate.setDate(expirationDate.getDate() + 1); // Add 1 day
        expirationISOString = expirationDate.toISOString();
        vcDataPreview.expirationDate = expirationISOString;
      }

      //TODO confirmar que vendria dado el id para guardar credential offer, modificar endpoint si es asi
      let id = randomBytes(16).toString('hex');
      let idExists = (await this.vcDataModelsStorage.get(id)) === null;
      while (idExists) {
        id = randomBytes(16).toString('hex');
        idExists = (await this.vcDataModelsStorage.get(id)) === null;
      }
      this.vcDataModelsStorage.add({ id, ...vcDataPreview });
      return {
        success: true,
        result: { id: id, credentialOffer: JSON.stringify(vcDataPreview) },
        error: null,
      };
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to create the credential offer`,
        error.stack,
      );
      return { success: false, result: null, error: error.message };
    }
  }

  /**
   * @param offerId id of the credential offer that has been confirmed to be issued
   * @param subjectDid DID of the entity that the credential is being issued to
   * @returns A VC JWT; a secure URL-safe string representation of a credential, ideal for storage or transmission between two parties
   */
  async issueCredentialGivenOfferId(
    offerId: string,
    subjectDid: string,
  ): Promise<{
    success: boolean;
    result: string | null;
    error: string | null;
  }> {
    try {
      const credentialData = await this.vcDataModelsStorage.get(offerId);

      if (!credentialData)
        throw new Error(`Credential Offer with ID ${offerId} not found`);

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

      await this.dwnService.saveCredentialtoDWN(
        subjectDid,
        signedVcJwt,
        credentialData.type[0],
      );

      return {
        success: true,
        result: signedVcJwt,
        error: null,
      };
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to issue a Verifiable credential given data associated to id ${offerId}`,
        error.stack,
      );
      return { success: false, result: null, error: error.message };
    }
  }

  /**
   * @param data data that is going to be used to form the credential claims
   * @param schemaId id of the schema associated to the credential that is going to be offered where mapping rules and credential properties are defined
   * @param subjectDid DID of the entity that the credential is being issued to
   * @returns A VC JWT; a secure URL-safe string representation of a credential, ideal for storage or transmission between two parties
   */
  async issueCredential(
    data: any,
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

      if (
        schema.type.includes('https://identity-iovf.xyz/schemas/driversLicense')
      ) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getFullYear() + 5); // Add 5 years
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

      await this.dwnService.saveCredentialtoDWN(
        subjectDid,
        signedVcJwt,
        credentialData.type[0],
      );

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
   * @param issuerDid did of the issuer that needs to be added as constraint to the PD
   * @param pdId id of the PD that is stored in database/memory
   * @returns a JSON string that contains the Presentation Definition
   */

  async getPresentationDefinition(
    issuerDid: string | undefined,
    pdId: string,
  ): Promise<{
    success: boolean;
    result: string | null;
    error: string | null;
  }> {
    try {
      if (!pdId)
        throw new Error(
          `No pdId was provided for generating the presentation definition`,
        );

      const pdForEvents = await this.presentationsDefinitions.get(pdId);

      const pdCopy = JSON.parse(JSON.stringify(pdForEvents));
      // If there are errors with the PD, an error will be thrown
      const validated = PresentationExchange.validateDefinition({
        presentationDefinition: pdCopy,
      });

      if (validated)
        pdCopy.input_descriptors[0].constraints.fields.push({
          path: ['$.issuer'],
          filter: {
            type: 'string',
            pattern: issuerDid,
          },
        });

      return {
        success: true,
        result: JSON.stringify(pdCopy),
        error: null,
      };
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to retrieve the presentation definition with id ${pdId}`,
        error.stack,
      );
      return { success: false, result: null, error: error.message };
    }
  }

  /**
   * @param signedPresentation A Verifiable Presentation as a signed and encoded JWT
   * @param issuerDid did of the issuer associated to the PD in matter(if any. Can be undefined and no specific issuer would be require as constraint)
   * @param pdId id of the PD that is stored in database/memory
   * @returns a boolean that represents whether the signedPresentation satisfies or not the PD
   */
  async evaluatesPresentationSubmission(
    signedPresentation: string,
    issuerDid: string | undefined,
    pdId: string,
  ): Promise<{
    success: boolean;
    result: boolean | null;
    error: string | null;
  }> {
    try {
      const { result: pd } = await this.getPresentationDefinition(
        issuerDid,
        pdId,
      );
      PresentationExchange.satisfiesPresentationDefinition({
        vcJwts: [signedPresentation],
        presentationDefinition: JSON.parse(pd),
      });

      return {
        success: true,
        result: true,
        error: null,
      };
    } catch (error) {
      this.logger.error(
        `An error occurred while validating the submitted presentation`,
        error.stack,
      );
      return { success: false, result: false, error: error.message };
    }
  }
}
