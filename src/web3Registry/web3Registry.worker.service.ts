import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Web3RegistryService } from './web3Registry.service';
import { backOff } from 'exponential-backoff';

@Injectable()
export class Web3RegistryWorkerService {
  private readonly logger = new Logger(Web3RegistryWorkerService.name);
  private isProcessing = false;

  constructor(private readonly web3RegistryService: Web3RegistryService) {}

  /**
   * Runs every 30 seconds to process outbox records.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async processOutbox() {
    if (this.isProcessing) {
      this.logger.debug('Outbox worker already processing, skipping this cycle');
      return;
    }

    this.isProcessing = true;

    try {
      const records = await this.web3RegistryService.getOutboxRecordsForRetry(10);

      if (records.length === 0) {
        this.logger.debug('No outbox records to process');
        return;
      }

      this.logger.log(`Processing ${records.length} outbox record(s)`);

      for (const record of records) {
        await this.processOutboxRecord(record);
      }
    } catch (error) {
      this.logger.error(`Error in outbox worker: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processOutboxRecord(record: any): Promise<void> {
    const { id, didUri, didKey, manifestCid, attempts } = record;
    const correlationId = `outbox-${id.substring(0, 8)}`;

    this.logger.log(
      `[${correlationId}] Processing outbox record: id=${id}, attempts=${attempts}, didKey=${didKey}`,
    );

    try {
      // Update status to 'sent' before attempting
      await this.web3RegistryService.updateOutboxRecord(id, {
        status: 'sent',
        attempts: attempts + 1,
      });

      // Attempt write with exponential backoff
      const result = await backOff(
        async () => {
          return await this.web3RegistryService.setManifestCid(
            didUri,
            manifestCid,
            correlationId,
          );
        },
        {
          numOfAttempts: 3,
          startingDelay: 1000,
          maxDelay: 10000,
          retry: (error: any) => {
            this.logger.warn(
              `[${correlationId}] Retry attempt failed: ${error.message}`,
            );
            return true;
          },
        },
      );

      // Success - mark as confirmed
      await this.web3RegistryService.updateOutboxRecord(id, {
        status: 'confirmed',
        txHash: result.txHash,
      });

      this.logger.log(
        `[${correlationId}] Outbox record confirmed: id=${id}, txHash=${result.txHash}`,
      );
    } catch (error) {
      // Calculate next attempt time with exponential backoff
      const backoffMs = Math.min(1000 * Math.pow(2, attempts), 3600000); // Max 1 hour
      const nextAttemptAt = new Date(Date.now() + backoffMs);

      await this.web3RegistryService.updateOutboxRecord(id, {
        status: 'failed',
        lastError: error.message,
        nextAttemptAt,
      });

      this.logger.warn(
        `[${correlationId}] Outbox record failed: id=${id}, attempts=${attempts + 1}, nextAttemptAt=${nextAttemptAt.toISOString()}, error=${error.message}`,
      );
    }
  }
}


