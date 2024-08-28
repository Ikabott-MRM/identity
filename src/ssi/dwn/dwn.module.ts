import { Module } from '@nestjs/common';
import { DWNService } from './dwn.service';
import { DWNController } from './dwn.controller';

@Module({
  providers: [DWNService],
  exports: [DWNService],
  controllers: [DWNController],
})
export class DWNModule {}
