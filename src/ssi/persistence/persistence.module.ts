import { Module } from '@nestjs/common';
import { PersistenceService } from './persistence.service';
import { EmailModule } from './email/email.module';
import { EncryptionModule } from '../../encryption/encryption.module';
import { CredentialsRegistryModule } from '../../credentialsRegistry/credentialsRegistry.module';
import { IpfsModule } from 'src/ipfs/ipfs.module';

@Module({
  providers: [PersistenceService],
  imports: [
    EmailModule,
    EncryptionModule,
    CredentialsRegistryModule,
    IpfsModule,
  ],
  exports: [PersistenceService],
})
export class PersistenceModule {}
