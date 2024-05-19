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
import { InviteeService } from './invitee/invitee.service';
import { InviteeModule } from './invitee/invitee.module';
import { DWNModule } from './ssi/dwn/dwn.module';
import { AUTHORIZED_CALLER_TOKEN } from './ssi/dwn/authorized-caller.provider';
import { DWNController } from './ssi/dwn/dwn.controller';
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
    InviteeModule,
    DWNModule,
  ],
  controllers: [MembersController, IssuerAgentController, DWNController],
  providers: [
    //IMPORTANT NOTE!!!
    //Services should not be imported directly. It breaks modularity and can lead
    //to haveing that service instantiated multiple times
    //Services that need to be used in other modules, needs to be exported by their defining module

    //only modules should be imported in order to promote a modular arch
    //and to simplify dependency management as each module is responsible of managing and providing its components
    MembersService,
    InviteeService,
    Logger,
    {
      provide: AUTHORIZED_CALLER_TOKEN,
      useValue: Symbol('AUTHORIZED_CALLER_TOKEN'),
    },
  ],
})
export class AppModule {}
