import { Module } from '@nestjs/common';
import { IssuerAgentService } from './issuerAgent.service';
import { IssuerAgentController } from './issuerAgent.controller';
import { CredentialsSchemasInMemoryRepository } from './inMemoryRepositories/credentialsSchemas-in-memory';
import { DWNModule } from './dwn/dwn.module';
import { EmailService } from './persistence/email/email.service';
import { PersistenceService } from './persistence/persistence.service';
import { EncryptionModule } from 'src/encryption/encryption.module';

@Module({
  imports: [DWNModule, EncryptionModule],
  providers: [
    IssuerAgentService,
    CredentialsSchemasInMemoryRepository,
    EmailService,
    PersistenceService,
  ],
  controllers: [IssuerAgentController],
  exports: [
    IssuerAgentService,
    CredentialsSchemasInMemoryRepository,
    EmailService,
    PersistenceService,
  ],
})
export class IssuerAgentModule {}
