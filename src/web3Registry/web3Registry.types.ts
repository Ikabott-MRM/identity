export interface Web3Config {
  enabled: boolean;
  rpcUrl?: string;
  chainId: number;
  contractAddress?: string;
  privateKey?: string;
  confirmations: number;
  txTimeoutMs: number;
}

export interface SetManifestCidResult {
  txHash: string;
  didKey: string;
  manifestCid: string;
  blockNumber?: number;
  gasUsed?: bigint;
}

export interface OutboxRecord {
  id: string;
  didUri: string;
  didKey: string;
  manifestCid: string;
  status: 'pending' | 'sent' | 'confirmed' | 'failed';
  txHash?: string;
  attempts: number;
  lastError?: string;
  nextAttemptAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}


