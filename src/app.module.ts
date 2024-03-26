import { Module , Logger} from '@nestjs/common';
import { MembersModule } from './members/members.module';
import { KnexModule } from './db/knex.module';
import { MembersController } from './members/members.controller';
import { MembersService } from './members/members.service';
import { SsiService } from './ssi/ssi.service';
import { SsiModule } from './ssi/ssi.module';
import { EventsModule } from './events/events.module';
import { ConfigModule } from '@nestjs/config';
import configuration from "./config/configuration";

const ENV = process.env.NODE_ENV;
const envFilePath = [!ENV ? ".env" : `.env.${ENV}`];

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath,
      isGlobal: true,
      load: [configuration],
    }),
    MembersModule,
    KnexModule,
    SsiModule,
    EventsModule,
  ],
  controllers: [MembersController],
  providers: [MembersService, SsiService, Logger],
})
export class AppModule {}
