import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import {
  ApiBody,
  ApiTags,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { SsiService } from './ssi.service';
import { CreateDIDDto } from './dto/createDIDDto.dto';
import { ConfigService } from '@nestjs/config';
import { sendResponse } from 'src/helpers/functions';

@ApiTags('ssi-manager')
@Controller('ssi-manager')
export class SSiController {
  private readonly logger: Logger = new Logger(SSiController.name);
  constructor(
    private readonly ssiService: SsiService,
    private configService: ConfigService,
  ) {}

  @ApiOperation({
    summary: 'It creates a new DID using the did method passed in the body',
  })
  @ApiOkResponse({
    status: 201,
    description: 'DID successfully created',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error. Message field on response will provide a more accurate description of it',
  })
  @ApiBody({
    type: CreateDIDDto,
    description: 'did method to be used for the DID to be created',
  })
  @Post('createDID')
  //TODO si solo recibe un didMethod cambiar el DTO
  async createDID(@Body() createDidDto: CreateDIDDto) {
    const ssiProject = this.configService.get('ssi.ssiProjectName');
    let result: any;
    switch (ssiProject) {
      case 'TBD':
        result = await this.ssiService.createTBDIdentity(
          createDidDto.didMethod,
        );
        break;
    }
    if (result?.success) {
      this.logger.debug('Created DID');
      return sendResponse(result.result, 201, 'did created');
    }

    //TODO se deberia de validar que did methods estan soportados segun el projecto para
    //tirar error 400 si no es uno de esos did methods
    // de tbd se pueden obtener de una con un get, de quarkid habria que setearlos, y de polygon id?
    //   return sendResponse(null, 400, result.error);
    return sendResponse(null, 500, result.error);
  }
}
