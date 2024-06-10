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
import * as Joi from 'joi';

const ENV = process.env.NODE_ENV;
const envFilePath = [!ENV ? '.env' : `.env.${ENV}`];

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath,
      isGlobal: true,
      load: [configuration],
      // check if postgres environment variables are set
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test', 'provision')
          .default('development'),
        POSTGRES_HOST: Joi.string().required(),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_PASSWORD: Joi.string().required(),
      }),
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
