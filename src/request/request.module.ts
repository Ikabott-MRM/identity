import { Module } from '@nestjs/common';
import { RequestController } from './request.controller';
import { RequestService } from './request.service';
import { KnexModule } from '../db/knex.module';
import { IssuerAgentModule } from '../ssi/issuerAgent.module';

@Module({
  controllers: [RequestController],
  providers: [RequestService],
  imports: [KnexModule, IssuerAgentModule],
})
export class RequestModule {}
