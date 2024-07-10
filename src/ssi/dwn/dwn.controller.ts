import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { sendResponse } from 'src/helpers/functions';
import { DWNService } from './dwn.service';

@ApiTags('dwn')
@Controller('dwn')
export class DWNController {
  private readonly logger: Logger = new Logger(DWNController.name);
  constructor(private readonly dwnService: DWNService) {}

  @Get('credentials')
  @ApiOperation({
    summary:
      'It retrieves VCs stored on the DWN node whose holder is the DID passed as parameters.',
  })
  @ApiQuery({
    name: 'holderDid',
    required: true,
    description: 'DID of the user for who the VCs are being fetched.',
    schema: { type: 'string' },
  })
  @ApiOkResponse({
    status: 200,
    description: 'VCs successfully retrieved.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error. Message field on response will provide a more accurate description of it.',
  })
  async credentials(@Query('holderDid') holderDid: string) {
    if (!holderDid)
      return sendResponse(
        null,
        400,
        `holderDid cannot be undefined. A value must be passed as query parameter.`,
      );
    const result = await this.dwnService.queryCredentialsFromDWN(holderDid);

    if (result?.success) {
      this.logger.debug(
        `DWN node successfully queried for VCs of ${holderDid}`,
      );
      return sendResponse(result.result, 200, null);
    }
    return sendResponse(null, 500, result.error);
  }
}
