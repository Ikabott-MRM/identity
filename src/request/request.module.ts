import { Module } from '@nestjs/common';
import { RequestController } from './request.controller';
import { RequestService } from './request.service';
import { KnexModule } from '../db/knex.module';
import { IssuerAgentModule } from '../ssi/issuerAgent.module';
import { DocumentsModule } from '../documents/documents.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [RequestController],
  providers: [RequestService],
  imports: [KnexModule, IssuerAgentModule, DocumentsModule, AuthModule],
})
export class RequestModule {}
