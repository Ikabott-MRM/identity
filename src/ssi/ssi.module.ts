import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SsiService } from './ssi.service';
import { SSiController } from './ssi.controller';

@Module({
  imports: [HttpModule],
  providers: [SsiService],
  controllers: [SSiController],
})
export class SsiModule {}
