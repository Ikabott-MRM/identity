import { Injectable } from '@nestjs/common';


// interface ZeroKnowledgeProofRequest {
//   ID: number;
//   CircuitID: string;
//   Query: MemberCredential;
// }

interface DIDMetadata {
  method: string;
  blockchain: string;
  network: string;
  type: string;
}

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

  // async createVerifiableClaim(
  //   req: CreateVerifiableClaimRequest,
  // ): Promise<void> {
  //   return null;
  // }

  async createIdentity(metadata: DIDMetadata): Promise<void> {
    return null;
  }

  // async izZKClaimValid(req: ZeroKnowledgeProofRequest): Promise<boolean> {
  //   return null;
  // }

  // async isClaimValid(req: VCProofRequest): Promise<boolean> {
  //   return null;
  // }
}
