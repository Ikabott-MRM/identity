import { Controller, Post, Body, Param, Delete, Get } from '@nestjs/common';
import { PinataGatewayService } from './pinataGateway.service';

//TODO tengo que ver como es lo de setear el service dinamicamente
//TODO agregar el service que es para lo que es compatible con la implementacion de Kubo

//TODO en realidad no se va a usar el controller, pero es para probar que estuivese suiendo ok las cosas
@Controller('ipfs')
export class IpfsController {
  constructor(private readonly ipfsGateway: PinataGatewayService) {}

  @Post('upload')
  async uploadContent(
    @Body('content') content: string,
  ): Promise<string> {
    return this.ipfsGateway.uploadContent(content);
  }

  @Delete('unpin/:cid')
  async unpinCid(@Param('cid') cid: string): Promise<string> {
    return this.ipfsGateway.unpinCid(cid);
  }

  @Get('getContent/:cid')
  async getContent(@Param('cid') cid: string): Promise<string | object> {
    return this.ipfsGateway.getContent(cid);
  }
}
