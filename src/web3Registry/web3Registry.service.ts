import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  JsonRpcProvider,
  Wallet,
  Contract,
  TransactionReceipt,
  formatUnits,
} from 'ethers';
import { Knex } from 'knex';
import { Web3Config, SetManifestCidResult } from './web3Registry.types';
import {
  deriveDidKey,
  isValidCid,
  redactForLogging,
  extractRpcHost,
} from './web3Registry.util';
import { v4 as uuidv4 } from 'uuid';

// ABI for DidManifestRegistry contract
const CONTRACT_ABI = [
  'function setManifestCid(bytes32 didKey, string calldata manifestCid)',
  'function setManifestCidsBatch(bytes32[] calldata didKeys, string[] calldata manifestCids)',
  'function getManifestCid(bytes32 didKey) external view returns (string memory)',
  'function deleteManifestCid(bytes32 didKey)',
  'function deleteManifestCidsBatch(bytes32[] calldata didKeys)',
  'function owner() external view returns (address)',
  'event ManifestCidSet(bytes32 indexed didKey, string manifestCid, address indexed writer)',
  'event ManifestCidsBatchSet(bytes32[] didKeys, string[] manifestCids, address indexed writer)',
  'event ManifestCidDeleted(bytes32 indexed didKey, address indexed writer)',
  'event ManifestCidsBatchDeleted(bytes32[] didKeys, address indexed writer)',
] as const;

@Injectable()
export class Web3RegistryService implements OnModuleInit {
  private readonly logger = new Logger(Web3RegistryService.name);
  private provider: JsonRpcProvider | null = null;
  private wallet: Wallet | null = null;
  private contract: Contract | null = null;
  private config: Web3Config;
  private isInitialized = false;

  constructor(
    private readonly configService: ConfigService,
    @Inject('KnexConnection') private readonly knex: Knex,
  ) {
    this.config = this.configService.get<Web3Config>('web3') || {
      enabled: false,
      chainId: 31,
      confirmations: 1,
      txTimeoutMs: 60000,
    };
  }

  async onModuleInit() {
    if (!this.config.enabled) {
      this.logger.warn(
        'Web3Registry is disabled (WEB3_ENABLED=false). Rootstock writes will be skipped.',
      );
      return;
    }

    try {
      await this.initialize();
      this.isInitialized = true;
      this.logger.log(
        `Web3Registry initialized for Rootstock testnet (chainId: ${this.config.chainId}, contract: ${redactForLogging(this.config.contractAddress || 'not set')})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize Web3Registry: ${error.message}`,
        error.stack,
      );
      this.logger.warn(
        'Issuance will continue, but Rootstock writes will be queued for retry.',
      );
    }
  }

  private async initialize(): Promise<void> {
    if (!this.config.rpcUrl) {
      throw new Error('WEB3_RPC_URL is required when WEB3_ENABLED=true');
    }
    if (!this.config.contractAddress) {
      throw new Error(
        'WEB3_CONTRACT_ADDRESS is required when WEB3_ENABLED=true',
      );
    }
    if (!this.config.privateKey) {
      throw new Error('WEB3_PRIVATE_KEY is required when WEB3_ENABLED=true');
    }

    this.provider = new JsonRpcProvider(this.config.rpcUrl, {
      chainId: this.config.chainId,
      name: 'rootstock-testnet',
    });

    this.wallet = new Wallet(this.config.privateKey, this.provider);
    this.contract = new Contract(
      this.config.contractAddress,
      CONTRACT_ABI,
      this.wallet,
    );

    // Verify connection
    const network = await this.provider.getNetwork();
    if (Number(network.chainId) !== this.config.chainId) {
      throw new Error(
        `Chain ID mismatch: expected ${this.config.chainId}, got ${Number(network.chainId)}`,
      );
    }

    const balance = await this.provider.getBalance(this.wallet.address);
    this.logger.debug(
      `Wallet address: ${this.wallet.address}, balance: ${formatUnits(balance)} RBTC`,
    );
  }

  /**
   * Enqueues a manifest CID write to the outbox, or attempts immediate write if initialized.
   * Returns immediately to avoid blocking issuance.
   */
  async enqueueOrWriteManifestCid(
    didUri: string,
    manifestCid: string,
    correlationId: string,
  ): Promise<void> {
    if (!this.config.enabled) {
      this.logger.debug(
        `[${correlationId}] Web3 disabled, skipping Rootstock write for DID: ${redactForLogging(didUri)}`,
      );
      return;
    }

    if (!isValidCid(manifestCid)) {
      this.logger.warn(
        `[${correlationId}] Invalid manifest CID: ${manifestCid}, skipping Rootstock write`,
      );
      return;
    }

    const didKey = deriveDidKey(didUri);

    this.logger.log(
      `[${correlationId}] Enqueueing Rootstock write: didKey=${didKey}, manifestCid=${manifestCid}, didUri=${redactForLogging(didUri)}`,
    );

    try {
      // Try immediate write if initialized
      if (this.isInitialized && this.contract && this.wallet) {
        try {
          await this.setManifestCid(didUri, manifestCid, correlationId);
          this.logger.log(
            `[${correlationId}] Successfully wrote manifest CID to Rootstock immediately`,
          );
          return;
        } catch (error) {
          this.logger.warn(
            `[${correlationId}] Immediate write failed, will enqueue for retry: ${error.message}`,
          );
          // Fall through to enqueue
        }
      }

      // Enqueue for retry worker
      await this.enqueueToOutbox(didUri, didKey, manifestCid, correlationId);
    } catch (error) {
      this.logger.error(
        `[${correlationId}] Failed to enqueue Rootstock write: ${error.message}`,
        error.stack,
      );
      // Don't throw - issuance should continue
    }
  }

  /**
   * Directly sets manifest CID on Rootstock (called by retry worker or immediate write).
   */
  async setManifestCid(
    didUri: string,
    manifestCid: string,
    correlationId: string,
  ): Promise<SetManifestCidResult> {
    if (!this.contract || !this.wallet || !this.provider) {
      throw new Error('Web3Registry not initialized');
    }

    const didKey = deriveDidKey(didUri);
    const rpcHost = extractRpcHost(this.config.rpcUrl);

    this.logger.log(
      `[${correlationId}] Sending tx to Rootstock: didKey=${didKey}, manifestCid=${manifestCid}, rpcHost=${rpcHost}`,
    );

    try {
      const tx = await this.contract.setManifestCid(didKey, manifestCid);
      const txHash = tx.hash;
      const nonce = tx.nonce;

      this.logger.log(
        `[${correlationId}] Tx sent: hash=${txHash}, nonce=${nonce}, chainId=${this.config.chainId}`,
      );

      // Wait for confirmation
      const receipt: TransactionReceipt | null = await Promise.race([
        tx.wait(this.config.confirmations),
        new Promise<null>((_, reject) =>
          setTimeout(
            () => reject(new Error('Transaction timeout')),
            this.config.txTimeoutMs,
          ),
        ),
      ]);

      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }

      const blockNumber = receipt.blockNumber;
      const gasUsed = receipt.gasUsed;
      const status = receipt.status;

      this.logger.log(
        `[${correlationId}] Tx confirmed: hash=${txHash}, block=${blockNumber}, status=${status}, gasUsed=${gasUsed.toString()}, chainId=${this.config.chainId}`,
      );

      if (status !== 1) {
        throw new Error(`Transaction reverted: ${txHash}`);
      }

      return {
        txHash,
        didKey,
        manifestCid,
        blockNumber,
        gasUsed,
      };
    } catch (error) {
      this.logger.error(
        `[${correlationId}] Rootstock tx failed: ${error.message}, didKey=${didKey}, manifestCid=${manifestCid}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Reads manifest CID from Rootstock (for diagnostics).
   */
  async getManifestCidByDidUri(didUri: string): Promise<string | null> {
    if (!this.contract || !this.provider) {
      this.logger.warn(
        'Web3Registry not initialized, cannot read from Rootstock',
      );
      return null;
    }

    const didKey = deriveDidKey(didUri);
    try {
      const manifestCid = await this.contract.getManifestCid(didKey);
      return manifestCid && manifestCid.length > 0 ? manifestCid : null;
    } catch (error) {
      this.logger.error(
        `Failed to read manifest CID from Rootstock: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Enqueues a write to the outbox table for retry worker.
   */
  private async enqueueToOutbox(
    didUri: string,
    didKey: string,
    manifestCid: string,
    correlationId: string,
  ): Promise<void> {
    const id = uuidv4();
    const now = new Date();

    try {
      await this.knex('web3_manifest_outbox').insert({
        id,
        didUri,
        didKey,
        manifestCid,
        status: 'pending',
        attempts: 0,
        nextAttemptAt: now,
        created_at: now,
        updated_at: now,
      });

      this.logger.debug(
        `[${correlationId}] Enqueued to outbox: id=${id}, didKey=${didKey}`,
      );
    } catch (error) {
      this.logger.error(
        `[${correlationId}] Failed to enqueue to outbox: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Updates outbox record after retry attempt.
   */
  async updateOutboxRecord(
    id: string,
    updates: {
      status?: 'pending' | 'sent' | 'confirmed' | 'failed';
      txHash?: string;
      attempts?: number;
      lastError?: string;
      nextAttemptAt?: Date;
    },
  ): Promise<void> {
    const updateData: any = {
      updated_at: new Date(),
      ...updates,
    };

    if (updates.nextAttemptAt) {
      updateData.nextAttemptAt = updates.nextAttemptAt;
    }

    await this.knex('web3_manifest_outbox').where({ id }).update(updateData);
  }

  /**
   * Gets pending/failed outbox records ready for retry.
   */
  async getOutboxRecordsForRetry(limit = 10): Promise<any[]> {
    const now = new Date();
    return await this.knex('web3_manifest_outbox')
      .whereIn('status', ['pending', 'failed'])
      .where('nextAttemptAt', '<=', now)
      .orderBy('created_at', 'asc')
      .limit(limit);
  }

  /**
   * Gets outbox record by ID.
   */
  async getOutboxRecord(id: string): Promise<any | null> {
    const record = await this.knex('web3_manifest_outbox')
      .where({ id })
      .first();
    return record || null;
  }
}
