import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';

// interface ZeroKnowledgeProofRequest {
//   ID: number;
//   CircuitID: string;
//   Query: MemberCredential;
// }

type VerificationMethod = {
  id: string;
  type: string;
  controller: string;
  publicKeyJwk: PublicKeyJwk;
};

type PublicKeyJwk = {
  kty: string;
  crv: string;
  x: string;
  alg: string;
  kid: string;
};

type DIDDocument = {
  did: {
    '@context': string[];
    id: string;
    verificationMethod: VerificationMethod[];
    authentication: string[];
    assertionMethod: string[];
    keyAgreement: string[];
    capabilityInvocation: string[];
    capabilityDelegation: string[];
  };
};

// interface DIDMetadata {
//   method: string;
//   blockchain: string;
//   network: string;
//   type: string;
// }

// interface CreateVerifiableClaimRequest {
//   credentialSchema: string;
//   type: string;
//   credentialSubject: MemberCredentialSubject;
//   expiration: number;
// }

interface VCProofRequest {
  didDocumentPath: string;
}

@Injectable()
export class SsiService {
  private readonly logger = new Logger(SsiService.name);
  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  // async createVerifiableClaim(
  //   req: CreateVerifiableClaimRequest,
  // ): Promise<void> {
  //   return null;
  // }

  /**
   * This method creates a new TBD DID using Ed25519 as key type
   * @param {string} didMethod - The DID method to be used
   * @returns {DIDDocument} a DID document.
   */

  async createTBDIdentity(didMethod: string): Promise<{
    success: boolean;
    result: DIDDocument | null;
    error: string | null;
  }> {
    try {
      //TODO logs to debug
      console.log(this.configService.get('ssi.ssiServiceEndpoint'));
      console.log(
        `${this.configService.get('ssi.ssiServiceEndpoint')}/dids/${didMethod}`,
      );

      const { data } = await firstValueFrom(
        this.httpService
          .put<DIDDocument>(
            `${this.configService.get('ssi.ssiServiceEndpoint')}/dids/${didMethod}`,
            {
              keyType: 'Ed25519',
            },
          )
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(error);
              throw error;
            }),
          ),
      );

      return {
        success: true,
        result: data,
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

  // async izZKClaimValid(req: ZeroKnowledgeProofRequest): Promise<boolean> {
  //   return null;
  // }

  // async isClaimValid(req: VCProofRequest): Promise<boolean> {
  //   return null;
  // }
}
