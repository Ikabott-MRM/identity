import { Module } from '@nestjs/common';
import { DWNService } from './dwn.service';
import { AUTHORIZED_CALLER_TOKEN } from './authorized-caller.provider';
import { DWNController } from './dwn.controller';

@Module({
  providers: [
    DWNService,
    {
      provide: AUTHORIZED_CALLER_TOKEN,
      useValue: Symbol('AUTHORIZED_CALLER_TOKEN'),
    },
  ],
  exports: [
    DWNService,
    {
      provide: AUTHORIZED_CALLER_TOKEN,
      useValue: Symbol('AUTHORIZED_CALLER_TOKEN'),
    },
  ],
  controllers: [DWNController],
})
export class DWNModule {}
