import { Module } from '@nestjs/common';
import { IssuerAgentService } from './issuerAgent.service';
import { IssuerAgentController } from './issuerAgent.controller';
import { CredentialsSchemasInMemoryRepository } from './inMemoryRepositories/credentialsSchemas-in-memory';
import { PresentationsDefinitions } from './inMemoryRepositories/presentations-definitions-in-memory';
import { DWNModule } from './dwn/dwn.module';

@Module({
  imports: [DWNModule],
  providers: [
    IssuerAgentService,
    CredentialsSchemasInMemoryRepository,
    PresentationsDefinitions,
  ],
  controllers: [IssuerAgentController],
  exports: [
    IssuerAgentService,
    PresentationsDefinitions,
    CredentialsSchemasInMemoryRepository,
  ],
})
export class IssuerAgentModule {}
