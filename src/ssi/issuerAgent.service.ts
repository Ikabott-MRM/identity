import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BearerDid, DidDht } from '@web5/dids';
import { VerifiableCredential, PresentationExchange } from '@web5/credentials';
import { CredentialsSchemasInMemoryRepository } from './inMemoryRepositories/credentialsSchemas-in-memory';
import { mapDataWithRules } from '../helpers/functions';
import { MemoryTempDataService } from './storage/storage.service';
import { PresentationsDefinitions } from './inMemoryRepositories/presentations-definitions-in-memory';
import { randomBytes } from 'crypto';
import { Web5, Web5ConnectResult } from '@web5/api';
import { DWNService } from './dwn/dwn.service';
import { AUTHORIZED_CALLER_TOKEN } from './dwn/authorized-caller.provider';

@Injectable()
export class IssuerAgentService implements OnModuleInit {
  private readonly logger = new Logger(IssuerAgentService.name);
  private operationalDID: BearerDid | null = null;
  private vcDataModelsStorage: MemoryTempDataService =
    new MemoryTempDataService({ filepath: 'issuer-dataModels-storage.json' });
  private web5Instance: Web5;

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

      //TODO borrar before merge
      //Ahora como voy a estar usando el did del agente que se crea al usar web5 connect
      //para firmar y guardar las credenciales, tengo que obtenerlo de ese service

      this.operationalDID = await this.dwnService.getDWNAgentDid(
        this.dwnServiceToken,
      );

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
      console.log(credentialData);
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
  async issueCredential(
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
   * @param eventName name of the event for which the PD is needed
   * @returns a JSON string that contains the Presentation Definition
   */

  async getPresentationDefinitionForEvent(eventName: string): Promise<{
    success: boolean;
    result: string | null;
    error: string | null;
  }> {
    try {
      const pdForEvent = await this.presentationsDefinitions.get('PD_Attendee');
      // If there are errors with the PD, an error will be thrown
      const validated = PresentationExchange.validateDefinition({
        presentationDefinition: pdForEvent,
      });
      if (validated)
        pdForEvent.input_descriptors[0].constraints.fields.push({
          path: ['$.credentialSubject.eventName'],
          filter: {
            type: 'string',
            pattern: eventName,
          },
        });

      return {
        success: true,
        result: JSON.stringify(pdForEvent),
        error: null,
      };
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to retrieve the presentation definition for event ${eventName}`,
        error.stack,
      );
      return { success: false, result: null, error: error.message };
    }
  }

  /**
   * @param signedPresentation A Verifiable Presentation as a signed and encoded JWT
   * @param eventName name of the event associated to the PD in matter
   * @returns a boolean that represents whether the signedPresentation satisfies or not the PD
   */
  async evaluatesPresentationSubmission(
    signedPresentation: string,
    eventName: string,
  ): Promise<{
    success: boolean;
    result: boolean | null;
    error: string | null;
  }> {
    try {
      const { result: pd } =
        await this.getPresentationDefinitionForEvent(eventName);
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

  /**
   * @param signedPresentation A Verifiable Presentation as a signed and encoded JWT
   * @param eventName Name of the event for which attendee credential is intended to be issued
   * @param data data that is going to be used to form the credential claims
   * @returns credential offer for an attendee credential
   */
  async createAttendeeCredentialOffer(
    signedPresentation: string,
    eventName: string,
    data: object,
  ): Promise<{
    success: boolean;
    result: string | null;
    error: string | null;
  }> {
    try {
      const { result: pd } =
        await this.getPresentationDefinitionForEvent(eventName);

      PresentationExchange.satisfiesPresentationDefinition({
        vcJwts: [signedPresentation],
        presentationDefinition: JSON.parse(pd),
      });

      const { result: COResult } = await this.createCredentialOffer(
        'Attendance',
        data,
      );

      return {
        success: true,
        result: COResult.credentialOffer,
        error: null,
      };
    } catch (error) {
      this.logger.error(
        `An error occurred while creating the credential offer for the attendee credential`,
        error.stack,
      );
      return { success: false, result: null, error: error.message };
    }
  }
}
