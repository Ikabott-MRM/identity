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
import { DWNModule } from './ssi/dwn/dwn.module';
import { AUTHORIZED_CALLER_TOKEN } from './ssi/dwn/authorized-caller.provider';
import { DWNController } from './ssi/dwn/dwn.controller';
import { InvitationService } from './invitation/invitation.service';
import { InvitationModule } from './invitation/invitation.module';

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
    DWNModule,
    InvitationModule,
  ],
  controllers: [MembersController, IssuerAgentController, DWNController],
  providers: [
    MembersService,
    InvitationService,
    Logger,
    {
      provide: AUTHORIZED_CALLER_TOKEN,
      useValue: Symbol('AUTHORIZED_CALLER_TOKEN'),
    },
  ],
})
export class AppModule {}
