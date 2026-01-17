import { Module } from '@nestjs/common';
import { Web3RegistryService } from './web3Registry.service';
import { KnexModule } from '../db/knex.module';
import { Web3RegistryWorkerService } from './web3Registry.worker.service';

@Module({
  imports: [KnexModule],
  providers: [Web3RegistryService, Web3RegistryWorkerService],
  exports: [Web3RegistryService],
})
export class Web3RegistryModule {}


