import { Module, Logger } from '@nestjs/common';
import { KnexModule } from './db/knex.module';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { HttpModule } from '@nestjs/axios';
import { IssuerAgentController } from './ssi/issuerAgent.controller';
import { IssuerAgentModule } from './ssi/issuerAgent.module';
import { DWNModule } from './ssi/dwn/dwn.module';
import { DWNController } from './ssi/dwn/dwn.controller';
import { RequestModule } from './request/request.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import * as Joi from 'joi';
import { MailerModule } from '@nestjs-modules/mailer';

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
        DB_HOST: Joi.string().required(),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        // check if mailer environment variables are set
        MAILER_TRANSPORT_HOST: Joi.string().required(),
        MAIL_USER: Joi.string().required(),
        MAIL_PASSWORD: Joi.string().required(),
      }),
      validationOptions: {
        abortEarly: true,
      },
    }),
    MailerModule.forRoot({
      transport: {
        host: process.env.MAILER_TRANSPORT_HOST,
        secure: true,
        port: 465,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASSWORD,
        },
      },
    }),
    KnexModule,
    IssuerAgentModule,
    HttpModule,
    DWNModule,
    RequestModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'documents'),
      serveRoot: '/documents',
      serveStaticOptions: {
        index: false,
      },
    }),
  ],
  controllers: [IssuerAgentController, DWNController],
  providers: [Logger],
})
export class AppModule {}
