import { Module } from '@nestjs/common';
import { InviteeController } from './invitee.controller';
import { EventsModule } from '../events/events.module';
import { EventsService } from '../events/events.service';
import { KnexModule } from '../db/knex.module';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [InviteeController],
  providers: [EventsService, ConfigService],
  imports: [EventsModule, KnexModule],
})
export class InviteeModule {}
