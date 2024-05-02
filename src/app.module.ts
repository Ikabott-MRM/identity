import { Module, Logger } from '@nestjs/common';
import { MembersModule } from './members/members.module';
import { KnexModule } from './db/knex.module';
import { MembersController } from './members/members.controller';
import { MembersService } from './members/members.service';
import { EventsModule } from './events/events.module';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { HttpModule } from '@nestjs/axios';
import { EventbriteModule } from './eventbrite/eventbrite.module';
import { IssuerAgentController } from './ssi/issuerAgent.controller';
import { IssuerAgentService } from './ssi/issuerAgent.service';
import { IssuerAgentModule } from './ssi/issuerAgent.module';
import { CredentialsSchemasInMemoryRepository } from './ssi/inMemoryRepositories/credentialsSchemas-in-memory';
import { PresentationsDefinitions } from './ssi/inMemoryRepositories/presentations-definitions-in-memory';

const ENV = process.env.NODE_ENV;
const envFilePath = [!ENV ? '.env' : `.env.${ENV}`];

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath,
      isGlobal: true,
      load: [configuration],
    }),
    MembersModule,
    KnexModule,
    IssuerAgentModule,
    EventsModule,
    HttpModule,
    EventbriteModule,
  ],
  controllers: [MembersController, IssuerAgentController],
  providers: [
    MembersService,
    IssuerAgentService,
    CredentialsSchemasInMemoryRepository,
    PresentationsDefinitions,
    Logger,
  ],
})
export class AppModule {}
