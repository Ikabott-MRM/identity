import { Module } from '@nestjs/common';
import { InvitationController } from './invitation';
import { EventsModule } from '../events/events.module';
import { EventsService } from '../events/events.service';
import { KnexModule } from '../db/knex.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  controllers: [InvitationController],
  providers: [EventsService, ConfigService],
  imports: [EventsModule, KnexModule, ConfigModule],
})
export class InvitationModule {}
