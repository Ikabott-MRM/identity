import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MembersModule } from './members/members.module';
import { KnexModule } from './db/knex.module';
import { MembersController } from './members/members.controller';
import { MembersService } from './members/members.service';
import { SsiService } from './ssi/ssi.service';
import { SsiModule } from './ssi/ssi.module';
import { EventsModule } from './events/events.module';
import { EventbriteModule } from './eventbrite/eventbrite.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    MembersModule,
    KnexModule,
    SsiModule,
    EventsModule,
    EventbriteModule,
    ConfigModule.forRoot(),
  ],
  controllers: [AppController, MembersController],
  providers: [AppService, MembersService, SsiService],
})
export class AppModule {}
