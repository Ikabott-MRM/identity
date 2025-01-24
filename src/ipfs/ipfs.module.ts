// import { Module, DynamicModule } from '@nestjs/common';
// import { PinataGatewayService } from './pinataGateway.service';
// import { IpfsGateway } from './ipfs.interface';

// @Module({})
// export class IpfsModule {
//   static forRoot(config: { usePinata: boolean }): DynamicModule {
//     return {
//       module: IpfsModule,
//       providers: [
//         {
//           provide: `IpfsGateway`,
//           useClass: PinataGatewayService,
//         },
//         PinataGatewayService,
//         // KuboGatewayService,
//       ],
//       exports: [`IpfsGateway`],
//     };
//   }
// }

import { Module } from '@nestjs/common';
import { EncryptionModule } from 'src/encryption/encryption.module';
import { IpfsController } from './ipfs.controller';
import { PinataGatewayService } from './pinataGateway.service';

@Module({
  imports: [EncryptionModule],
  providers: [PinataGatewayService],
  controllers: [IpfsController],
  exports: [PinataGatewayService],
})
export class IpfsModule {}
