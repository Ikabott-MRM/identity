import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MembersModule } from './members/members.module';
import { KnexModule } from './db/knex.module';
import { MembersController } from './members/members.controller';
import { MembersService } from './members/members.service';

@Module({
  imports: [MembersModule, KnexModule],
  controllers: [AppController, MembersController],
  providers: [AppService, MembersService],
})
export class AppModule {}
