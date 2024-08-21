import { Module } from '@nestjs/common';
import { IssuerAgentService } from './issuerAgent.service';
import { IssuerAgentController } from './issuerAgent.controller';
import { CredentialsSchemasInMemoryRepository } from './inMemoryRepositories/credentialsSchemas-in-memory';
import { DWNModule } from './dwn/dwn.module';
import { EncryptionService } from './persistence/encryption.service';

@Module({
  imports: [DWNModule],
  providers: [
    IssuerAgentService,
    CredentialsSchemasInMemoryRepository,
    EncryptionService,
  ],
  controllers: [IssuerAgentController],
  exports: [
    IssuerAgentService,
    CredentialsSchemasInMemoryRepository,
    EncryptionService,
  ],
})
export class IssuerAgentModule {}
