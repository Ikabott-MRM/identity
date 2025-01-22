import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  BearerDid,
  DidDht,
  DidDhtDocument,
  DidDocument,
  PortableDid,
} from '@web5/dids';
import { VerifiableCredential } from '@web5/credentials';
import { CredentialsSchemasInMemoryRepository } from './inMemoryRepositories/credentialsSchemas-in-memory';
import { mapDataWithRules } from '../helpers/functions';
import { DWNService } from './dwn/dwn.service';
import { Jwk } from '@web5/crypto';
import { PersistenceService } from './persistence/persistence.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IssuerAgentService implements OnModuleInit {
  private readonly logger = new Logger(IssuerAgentService.name);
  private operationalDID: BearerDid | null = null;
  private gatewayUri: string;
  constructor(
    private readonly credentialsRepository: CredentialsSchemasInMemoryRepository,
    private readonly dwnService: DWNService,
    private readonly persistenceService: PersistenceService,
    private readonly configService: ConfigService,
  ) {
    this.gatewayUri = this.configService.get('ssi.gatewayUri');
  }

  async onModuleInit() {
    try {
      if (!this.operationalDID) {
        this.logger.debug(
          'Verifying if there is an encrypted DID to attempt recovery of the previous issuer.',
        );
        let issuerPortableDidString =
          await this.persistenceService.loadDidFile();

        if (Boolean(issuerPortableDidString)) {
          const issuerPortableDid = JSON.parse(issuerPortableDidString);

          this.operationalDID = await DidDht.import({
            portableDid: issuerPortableDid,
          });

          this.logger.log(`Issuer DID successfully recovered.`);
        } else {
          this.logger.log(`Initializing issuer for the first time.`);
          const portableDid = (await this.createAndExportTBDIdentity()).result;
          const issuerPortableDid = JSON.stringify(portableDid, null, 2);
          await this.persistenceService.createDidFile(issuerPortableDid);
          this.operationalDID = await DidDht.import({
            portableDid: portableDid,
          });
        }
        this.logger.debug(`operational DID of agent:`);
        this.logger.debug(this.operationalDID.uri);
      }
    } catch (err) {
      this.logger.error(
        `An error occurred while trying to initialize issuerAgent service`,
        err.stack,
      );
      throw err;
    }
  }

  /**
   * @returns a new DID using the `did:dht` method formed from a newly generated key.
   * by default a new Ed25519 key will be generated which serves as the Identity Key.
   */
  async createAndExportTBDIdentity(): Promise<{
    success: boolean;
    result: PortableDid | null;
    error: string | null;
  }> {
    try {
      // Creates a DID using the DHT method and publishes the DID Document to the DHT using gatewayUri provided through env variable
      this.logger.log(`A dht did is about to be created`);
      const didDht = await DidDht.create({
        options: { gatewayUri: this.gatewayUri },
      });

      const portableDid = await didDht.export();
      this.logger.log(`A dht did has been succesfully created`);
      return {
        success: true,
        result: portableDid,
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
   * @returns the DidDocument of the did passed as parameter
   */
  async resolveTBDIdentity(didUri: string): Promise<{
    success: boolean;
    result: DidDocument | null;
    error: string | null;
  }> {
    try {
      this.logger.log(`A dht did is about to be resolved`);
      console.log(didUri);
      const didResolution = await DidDhtDocument.get({
        didUri,
        gatewayUri: this.gatewayUri,
      });
      this.logger.log(`A dht did has been succesfully resolved`);
      return {
        success: true,
        result: didResolution.didDocument,
        error: null,
      };
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to resolve a DID`,
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
      //TODO aca cuando hace un issue de la credential tiene que incluir:
      /**
       * encriptar la credencial y guardarla en ipfs. Se le tiene que mandar al issuer un mail con los datos
       * que se usaron para encriptar esa credencial y el manifest o la salt sea la misma y explicar ocmo se genera el iv. Definir eso
       * la salt y la password van a ser las mismas. definir como se genera el IV
       * misma key para credenciales y manifest? manifest no tiene por que ir encriptado si no tiene nada sensible solo dids que son publicos, no?
       *
       * capaz asi cmo se tiene una encryption key para el portable did, se puede tener una para el ipfs storage y que tambien tenga que completar
       * datos para recuperarla y que sea la misma para todo lo que va a ipfs
       * o de ultima password y salt ya alcancen para todo si se sabe que el IV es un hash de X tipo del CID
       * se tendria que mandar un mail al generar la encryption key de ipfs y deberia de ser al levantal el issuer
       * Tiene sentido pedir mas de una password? para mi no, alcanza con tener salts distinas, sino es complicar mas al issuer
       *
       * asociar ese CID al did del holder en la bdd
       *
       * obtener el CID del current manifest del issuer
       *
       * obtener el manifest de IPFS usando ese CID
       *
       * desencriptar el manifest
       *
       * actualizar el manifest agregando el CID de la creedncial a las credenciales del holder
       *
       * encriptar el manifest
       *
       * guardarlo a IPFS
       *
       * agregar ese CID a la bdd en la tabla manifests
       */
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

      // TODO antes se guardaba aca en DWN, ahora tienen que hacerse todos los pasos de arriba
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
