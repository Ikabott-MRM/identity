import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { KnexModule } from '../db/knex.module';

@Module({
  controllers: [MembersController],
  providers: [MembersService],
  imports: [KnexModule],
})
export class MembersModule {}
