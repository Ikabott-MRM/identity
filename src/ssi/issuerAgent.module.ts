import { Module } from '@nestjs/common';
import { IssuerAgentService } from './issuerAgent.service';
import { IssuerAgentController } from './issuerAgent.controller';
import { CredentialsSchemasInMemoryRepository } from './inMemoryRepositories/credentialsSchemas-in-memory';
import { DWNModule } from './dwn/dwn.module';

@Module({
  imports: [DWNModule],
  providers: [
    IssuerAgentService,
    CredentialsSchemasInMemoryRepository,
  ],
  controllers: [IssuerAgentController],
  exports: [
    IssuerAgentService,
    CredentialsSchemasInMemoryRepository,
  ],
})
export class IssuerAgentModule {}
