import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { HttpModule } from '@nestjs/axios';
import { IssuerAgentModule } from './ssi/issuerAgent.module';
import { RequestModule } from './request/request.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import * as Joi from 'joi';
import { MailerModule } from '@nestjs-modules/mailer';
import { ApiKeyAuthGuard } from './auth/guards/api-key-auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { IpfsModule } from './ipfs/ipfs.module';
import { EmailModule } from './ssi/persistence/email/email.module';

const ENV = process.env.NODE_ENV;
const envFilePath = [!ENV ? '.env' : `.env.${ENV}`];

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath,
      isGlobal: true,
      load: [configuration],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test', 'provision')
          .default('development'),
        // check if database environment variables are set
        DB_HOST: Joi.string().required(),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        //check if gatewayUri variable is set
        GATEWAY_URI: Joi.string().required(),
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
    EmailModule,
    IpfsModule,
    // .forRoot({
    //   usePinata: process.env.IPFS_PROVIDER === 'pinata', // Use an environment variable to toggle
    // }),
    ScheduleModule.forRoot(),
    IssuerAgentModule,
    HttpModule,
    RequestModule,
    AuthModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'documents'),
      serveRoot: '/documents',
      serveStaticOptions: {
        index: false,
      },
    }),
  ],
  providers: [
    Logger,
    {
      provide: APP_GUARD,
      useClass: ApiKeyAuthGuard,
    },
  ],
})
export class AppModule {}
