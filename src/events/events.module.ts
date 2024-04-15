import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { KnexModule } from '../db/knex.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  controllers: [EventsController],
  providers: [EventsService, ConfigService],
  imports: [KnexModule, ConfigModule],
})
export class EventsModule {}
