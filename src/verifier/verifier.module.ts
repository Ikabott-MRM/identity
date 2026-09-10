import { Module } from '@nestjs/common';
import { KnexModule } from '../db/knex.module';
import { VerifierController } from './verifier.controller';
import { VerifierSessionService } from './verifier-session.service';

@Module({
  imports: [KnexModule],
  controllers: [VerifierController],
  providers: [VerifierSessionService],
  exports: [VerifierSessionService],
})
export class VerifierModule {}
