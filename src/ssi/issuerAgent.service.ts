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
import { Jwk } from '@web5/crypto';
import { PersistenceService } from './persistence/persistence.service';
import { ConfigService } from '@nestjs/config';
import {
  CredentialManifest,
  CredentialsManifestService,
} from '../credentialsRegistry/credentialsManifest.service';
import { PinataGatewayService } from '../ipfs/pinataGateway.service';
import { DidCidAssociationService } from '../credentialsRegistry/didCidAssociation.service';

export interface CredentialQueryResultObject {
  verifiableCredential: VerifiableCredential;
  vcJwt: string;
}

@Injectable()
export class IssuerAgentService implements OnModuleInit {
  private readonly logger = new Logger(IssuerAgentService.name);
  private operationalDID: BearerDid | null = null;
  private gatewayUri: string;
  constructor(
    private readonly credentialsRepository: CredentialsSchemasInMemoryRepository,
    private readonly persistenceService: PersistenceService,
    private readonly configService: ConfigService,
    private readonly credentialManifestService: CredentialsManifestService,
    //TODO aca es que se va a tener que ver cmo hacerlo dinamico, capaz podria ser al incializar el modulo o en el
    //constructor en funcion de variable?
    private readonly ipfsService: PinataGatewayService,
    private readonly didCidsAssociationService: DidCidAssociationService,
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
          if(!portableDid) throw new Error(`DID creation has failed.`)
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

      //frist: get credential manifest of issuer
      let currentManifest: CredentialManifest;
      let newManifest: CredentialManifest;
      const currentManifestCid =
        await this.credentialManifestService.getCurrentManifest();
      if (currentManifestCid)
        currentManifest = (await this.ipfsService.getContent(
          currentManifestCid,
        )) as CredentialManifest;

      //encrypt the signedVcJWT
      const encryptedCredential =
        await this.persistenceService.encryptCredential(
          signedVcJwt,
          subjectDid,
          vc.vcDataModel.id,
        );

      //upload it to IPFS
      const credentialCID = await this.ipfsService.uploadContent(
        `${vc.vcDataModel.id}-${encryptedCredential}`,
      );

      //associate credential CID to holder did uri
      await this.didCidsAssociationService.addCidToDid(
        credentialCID,
        subjectDid,
      );

      //add credential CID to manfiest of credentials issued by this issuer
      //if there is an already existing manifest, update it, otherwise create a new one
      if (currentManifest) {
        newManifest = await this.credentialManifestService.updateManifest(
          credentialCID,
          subjectDid,
          currentManifest,
        );
      } else {
        newManifest = await this.credentialManifestService.createManifest(
          credentialCID,
          subjectDid,
          this.operationalDID.uri,
        );
      }
      //convert CredentialManifest to string
      const newManifestString = JSON.stringify(newManifest);
      //upload manifest to IPFS
      const newManifestCID =
        await this.ipfsService.uploadContent(newManifestString);
      await this.credentialManifestService.addManifestToDatabase(
        newManifestCID,
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

  async parseCredential(vcJwt: string): Promise<VerifiableCredential> {
    const parsedCredential = VerifiableCredential.parseJwt({
      vcJwt,
    });

    return parsedCredential;
  }

  async queryCredentialsFromIPFS(holderDid: string): Promise<{
    success: boolean;
    result: CredentialQueryResultObject[] | null;
    error: string | null;
  }> {
    try {
      if (!holderDid) throw new Error(`holderDid cannot be undefined.`);

      //get all DIDs associated to holderDid
      const holderDidCids =
        await this.didCidsAssociationService.getCidsByDid(holderDid);

      if (!holderDidCids)
        return {
          success: true,
          result: null,
          error: null,
        };

      let results: CredentialQueryResultObject[];
      results = await Promise.all(
        holderDidCids.map(async holderDidCid => {
          // Fetch  content from IPFS
          const content = (await this.ipfsService.getContent(
            holderDidCid,
          )) as string;
          // Decrypt the credential
          const vcJwt = await this.persistenceService.decryptCredential(
            content,
            holderDid,
          );
          const parsedCredential = await this.parseCredential(vcJwt);
          return {
            vcJwt,
            verifiableCredential: parsedCredential,
          };
        }),
      );

      return {
        success: true,
        result: results,
        error: null,
      };
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to query and process credentials of holder ${holderDid} from IPFS`,
        error,
      );
      return { success: false, result: null, error: error.message };
    }
  }
}
