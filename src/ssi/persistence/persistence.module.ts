import { Module } from '@nestjs/common';
import { PersistenceService } from './persistence.service';
import { EmailModule } from './email/email.module';
import { EncryptionModule } from 'src/encryption/encryption.module';
import { CredentialsRegistryModule } from 'src/credentialsRegistry/credentialsRegistry.module';

@Module({
  providers: [PersistenceService],
  imports: [EmailModule, EncryptionModule, CredentialsRegistryModule],
  exports: [PersistenceService],
})
export class PersistenceModule {}
