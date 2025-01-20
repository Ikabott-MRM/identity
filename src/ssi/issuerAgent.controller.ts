import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiSecurity,
  ApiQuery,
} from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sendErrorResponse, sendResponse } from '../helpers/functions';
import { IssuerAgentService } from './issuerAgent.service';
import { IssueCredentialDto } from './dto/CredentialsIssuance.dto';
import { RequestError } from '../helpers/errors';

@ApiTags('issuerAgent')
@ApiSecurity('api-key')
@Controller('issuerAgent')
export class IssuerAgentController {
  private readonly logger: Logger = new Logger(IssuerAgentController.name);
  constructor(
    private readonly issuerAgentService: IssuerAgentService,
    private configService: ConfigService,
  ) {}

  @Post('did')
  @ApiOperation({
    summary: 'It creates a new DID',
  })
  @ApiResponse({
    status: 201,
    description: 'DID successfully created.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error. Message field on response will provide a more accurate description of it.',
  })
  async createDID() {
    const ssiProject = this.configService.get('ssi.ssiProjectName');
    let result: any;
    switch (ssiProject) {
      case 'TBD':
        result = await this.issuerAgentService.createAndExportTBDIdentity();
        break;
    }

    if (result?.success) {
      this.logger.debug('Created DID.');
      return sendResponse(result.result, 201, 'DID successfully created.');
    }
    return sendErrorResponse(RequestError.UNEXPECTED_ERROR, 500, result.error);
  }

  @Get('did')
  @ApiOperation({
    summary: 'It resolves a DID',
  })
  @ApiResponse({
    status: 200,
    description: 'DID successfully resolved.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error. Message field on response will provide a more accurate description of it.',
  })
  /*it is defined as query param because did uri has special characters.
  Query parameters are generally used for filtering or optional inputs and are not ideal for uniquely identifying resources*/
  @ApiQuery({
    name: 'didUri',
    required: true,
    description: 'didUri of the DID that is going to be resolved.',
    schema: { type: 'string' },
  })
  async resolveDID(@Query('didUri') didUri: string) {
    console.log(didUri);
    const ssiProject = this.configService.get('ssi.ssiProjectName');
    let result: any;
    switch (ssiProject) {
      case 'TBD':
        result = await this.issuerAgentService.resolveTBDIdentity(didUri);
        break;
    }

    if (result?.success) {
      this.logger.debug(`resolved DID document for DID ${didUri}.`);
      return sendResponse(result.result, 201, 'DID successfully resolved.');
    }
    return sendErrorResponse(RequestError.UNEXPECTED_ERROR, 500, result.error);
  }

  @Post('credential')
  @ApiOperation({
    summary:
      'Issues the VC using its schema Id, the DID of its intended holder, the expiration date to be set and the data for forming the claims.',
  })
  @ApiOkResponse({
    status: 200,
    description: 'VC successfully issued and retrieved.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request.Message field on response will provide a more accurate description of it.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error. Message field on response will provide a more accurate description of it.',
  })
  @ApiBody({
    type: IssueCredentialDto,
    description: 'Data needed for issuing a new credential',
  })
  async issueCredential(@Body() issueCredentialDto: IssueCredentialDto) {
    const { data, schemaId, subjectDid, expDate } = issueCredentialDto;

    const result = await this.issuerAgentService.issueCredential(
      data,
      expDate,
      schemaId,
      subjectDid,
    );

    if (result?.success) {
      this.logger.debug('VC successfully issued');
      return sendResponse(result.result, 200, 'VC successfully issued.');
    }
    return sendErrorResponse(RequestError.UNEXPECTED_ERROR, 500, result.error);
  }

  @Get('issuerPubK')
  @ApiOperation({
    summary: 'It retrieves issuer public key.',
  })
  @ApiOkResponse({
    status: 200,
    description: `Issuer's PK successfully retrieved.`,
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error. Message field on response will provide a more accurate description of it.',
  })
  async getIssuerPublicJWKey() {
    const result = await this.issuerAgentService.getIssuerPublicJWKey();

    if (result?.success) {
      this.logger.debug(`Issuer's PK successfully retrieved.`);
      return sendResponse(result.result, 200, null);
    }
    return sendErrorResponse(RequestError.UNEXPECTED_ERROR, 500, result.error);
  }
}
