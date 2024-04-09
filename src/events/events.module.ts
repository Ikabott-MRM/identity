import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { KnexModule } from '../db/knex.module';

@Module({
  controllers: [EventsController],
  providers: [EventsService],
  imports: [KnexModule],
})
export class EventsModule {}
