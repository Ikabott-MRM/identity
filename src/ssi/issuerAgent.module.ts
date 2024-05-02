import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { IssuerAgentService } from './issuerAgent.service';
import { IssuerAgentController } from './issuerAgent.controller';
import { CredentialsSchemasInMemoryRepository } from './inMemoryRepositories/credentialsSchemas-in-memory';
import { PresentationsDefinitions } from './inMemoryRepositories/presentations-definitions-in-memory';

@Module({
  providers: [
    IssuerAgentService,
    CredentialsSchemasInMemoryRepository,
    PresentationsDefinitions,
  ],
  controllers: [IssuerAgentController],
})
export class IssuerAgentModule {}
