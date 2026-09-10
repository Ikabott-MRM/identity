import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentUrlService } from './document-url.service';
import { KnexModule } from '../db/knex.module';
import { AuthModule } from '../auth/auth.module';
import { VerifierModule } from '../verifier/verifier.module';

@Module({
  imports: [KnexModule, AuthModule, VerifierModule],
  controllers: [DocumentsController],
  providers: [DocumentUrlService],
  exports: [DocumentUrlService],
})
export class DocumentsModule {}
