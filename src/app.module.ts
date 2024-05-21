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
import { IssuerAgentModule } from './ssi/issuerAgent.module';
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
