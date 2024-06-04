import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { KnexModule } from '../db/knex.module';

@Module({
  controllers: [VerificationController],
  providers: [VerificationService],
  imports: [KnexModule],
})
export class VerificationModule {}
