import { Module } from '@nestjs/common';
import { EventbriteController } from './eventbrite.controller';
import { EventbriteService } from './eventbrite.service';
import { ConfigService } from '@nestjs/config';
import { KnexModule } from '../db/knex.module';
import { EventsModule } from '../events/events.module';
import { EventsService } from '../events/events.service';

@Module({
  controllers: [EventbriteController],
  providers: [EventbriteService, ConfigService, EventsService],
  imports: [EventsModule, KnexModule],
})
export class EventbriteModule {}
