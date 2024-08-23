import { Module } from '@nestjs/common';
import { IssuerAgentService } from './issuerAgent.service';
import { IssuerAgentController } from './issuerAgent.controller';
import { CredentialsSchemasInMemoryRepository } from './inMemoryRepositories/credentialsSchemas-in-memory';
import { DWNModule } from './dwn/dwn.module';
import { EncryptionService } from './persistence/encryption.service';
import { EmailService } from './persistence/email/email.service';

@Module({
  imports: [DWNModule],
  providers: [
    IssuerAgentService,
    CredentialsSchemasInMemoryRepository,
    EmailService,
    EncryptionService,
  ],
  controllers: [IssuerAgentController],
  exports: [
    IssuerAgentService,
    CredentialsSchemasInMemoryRepository,
    EmailService,
    EncryptionService,
  ],
})
export class IssuerAgentModule {}
