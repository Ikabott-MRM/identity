import { Module } from '@nestjs/common';
import { KnexModule } from '../db/knex.module';
import { CredentialsManifestService } from './credentialsManifest.service';
import { DidCidAssociationService } from './didCidAssociation.service';
import { DidSaltAssociationService } from './didSaltAssociation.service';

@Module({
  providers: [
    CredentialsManifestService,
    DidCidAssociationService,
    DidSaltAssociationService,
  ],
  imports: [KnexModule],
  exports: [
    CredentialsManifestService,
    DidCidAssociationService,
    DidSaltAssociationService,
  ],
})
export class CredentialsRegistryModule {}
