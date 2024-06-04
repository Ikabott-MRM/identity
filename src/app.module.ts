import { Module, Logger } from '@nestjs/common';
import { KnexModule } from './db/knex.module';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { HttpModule } from '@nestjs/axios';
import { IssuerAgentController } from './ssi/issuerAgent.controller';
import { IssuerAgentModule } from './ssi/issuerAgent.module';
import { DWNModule } from './ssi/dwn/dwn.module';
import { AUTHORIZED_CALLER_TOKEN } from './ssi/dwn/authorized-caller.provider';
import { DWNController } from './ssi/dwn/dwn.controller';
import { VerificationModule } from './verification/verification.module';

const ENV = process.env.NODE_ENV;
const envFilePath = [!ENV ? '.env' : `.env.${ENV}`];

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath,
      isGlobal: true,
      load: [configuration],
    }),
    KnexModule,
    IssuerAgentModule,
    HttpModule,
    DWNModule,
    VerificationModule,
  ],
  controllers: [IssuerAgentController, DWNController],
  providers: [
    Logger,
    {
      provide: AUTHORIZED_CALLER_TOKEN,
      useValue: Symbol('AUTHORIZED_CALLER_TOKEN'),
    },
  ],
})
export class AppModule {}
