import { Injectable } from '@nestjs/common';

interface MemberCredentialSubject {
  name: string;
  lastname: string;
  position: string;
}

interface MemberCredential {
  allowedIssuers: string[];
  credentialSubject: MemberCredentialSubject;
  context: string;
  type: string;
}

interface ZeroKnowledgeProofRequest {
  ID: number;
  CircuitID: string;
  Query: MemberCredential;
}

interface DIDMetadata {
  method: string;
  blockchain: string;
  network: string;
  type: string;
}

interface CreateVerifiableClaimRequest {
  credentialSchema: string;
  type: string;
  credentialSubject: MemberCredentialSubject;
  expiration: number;
}

@Injectable()
export class SsiService {
  async createVerifiableClaim(
    req: CreateVerifiableClaimRequest,
  ): Promise<void> {
    return null;
  }

  // Select method, blockchain, network, type based on .env
  async createIdentity(metadata: DIDMetadata): Promise<void> {
    // Create identity and append metadata
    return null;
  }

  async verifyClaim(req: ZeroKnowledgeProofRequest): Promise<void> {
    // Verify ZK proof
    return null;
  }
}
