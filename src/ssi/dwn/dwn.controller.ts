import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sendResponse } from 'src/helpers/functions';
import { DWNService } from './dwn.service';

@ApiTags('dwn')
@Controller('dwn')
export class DWNController {
  private readonly logger: Logger = new Logger(DWNController.name);
  constructor(
    private readonly dwnService: DWNService,
    private configService: ConfigService,
  ) {}

  @ApiOperation({
    summary: 'It creates a new DID',
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
  @Get('read')
  async credentials(holderDid: string) {
    const result = await this.dwnService.queryCredentialsFromDWN(holderDid);

    if (result?.success) {
      this.logger.debug('DID successfully queried');
      console.log(result);
      return sendResponse(result.result, 200, null);
    }
    return sendResponse(null, 500, result.error);
  }
}
