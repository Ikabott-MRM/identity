import { Module } from '@nestjs/common';
import { IssuerAgentService } from './issuerAgent.service';
import { IssuerAgentController } from './issuerAgent.controller';
import { CredentialsSchemasInMemoryRepository } from './inMemoryRepositories/credentialsSchemas-in-memory';
import { EncryptionModule } from 'src/encryption/encryption.module';
import { KnexModule } from 'src/db/knex.module';
import { CredentialsRegistryModule } from 'src/credentialsRegistry/credentialsRegistry.module';
import { IpfsModule } from 'src/ipfs/ipfs.module';
import { EmailModule } from './persistence/email/email.module';
import { PersistenceModule } from './persistence/persistence.module';

@Module({
  imports: [
    IpfsModule,
    EmailModule,
    EncryptionModule,
    KnexModule,
    CredentialsRegistryModule,
    PersistenceModule,
  ],
  providers: [IssuerAgentService, CredentialsSchemasInMemoryRepository],
  controllers: [IssuerAgentController],
  exports: [IssuerAgentService, CredentialsSchemasInMemoryRepository],
})
export class IssuerAgentModule {}
