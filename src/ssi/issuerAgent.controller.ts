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
import { IssuerAgentService } from './issuerAgent.service';
import { CredentialOfferDto } from './dto/CredentialOffer.dto';

@ApiTags('issuerAgent')
@Controller('issuerAgent')
export class IssuerAgentController {
  private readonly logger: Logger = new Logger(IssuerAgentController.name);
  constructor(
    private readonly issuerAgentService: IssuerAgentService,
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
  @Post('createDID')
  async createDID() {
    const ssiProject = this.configService.get('ssi.ssiProjectName');
    let result: any;
    switch (ssiProject) {
      case 'TBD':
        result = await this.issuerAgentService.createAndExportTBDIdentity();
        break;
    }

    if (result?.success) {
      this.logger.debug('Created DID');
      return sendResponse(result.result, 201, 'did created');
    }
    return sendResponse(null, 500, result.error);
  }

  @ApiOperation({
    summary:
    'It creates a credential offer using the credential schema ID and the intended holder data.',
  })
  @ApiOkResponse({
    status: 201,
    description: 'Credential Offer successfully created and retrieved',
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
    type: CredentialOfferDto,
    description:
      'schema of the VC intended to be offered and data needed for the credential',
  })
  @Post('credentialOffer')
  async createCredentialOffer(@Body() credentialOfferData: CredentialOfferDto) {
    const result = await this.issuerAgentService.createCredentialOffer(
      credentialOfferData.schemaId,
      credentialOfferData.data,
    );

    if (result?.success) {
      this.logger.debug('Credential Offer successfully created and retrieved');
      return sendResponse(
        result.result,
        201,
        'Credential Offer successfully created and retrieved',
      );
    }
    return sendResponse(null, 500, result.error);
  }

  @ApiOperation({
    summary: 'Issues the VC using its credential offer and the DID of its intended holder.',
  })
  @ApiOkResponse({
    status: 200,
    description: 'VC successfully issued and retrieved',
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
  @Post('issueCredential')
  async issueCredential(
    @Body('offerId') offerId: string,
    @Body('subjectDid') subjectDid: string,
  ) {
    const result = await this.issuerAgentService.issueCredential(
      offerId,
      subjectDid,
    );

    if (result?.success) {
      this.logger.debug('VC successfully issued');
      return sendResponse(result.result, 200, 'vc successfully issued');
    }
    return sendResponse(null, 500, result.error);
  }

  @ApiOperation({
    summary:
      'It retrieves the presentation definition for the requested credential.',
  })
  @ApiOkResponse({
    status: 200,
    description: 'Presentation definition successfully retrieved',
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
  @ApiQuery({
    name: 'pdId',
    description: 'ID of the presentation definition',
    required: true,
    type: String,
  })
  @ApiQuery({
    name: 'eventName',
    description: 'Name of the event',
    required: true,
    type: String,
  })
  @Get('getPd')
  async getPresentationDefinition(@Query('eventName') eventName: string) {
    const result =
      await this.issuerAgentService.getPresentationDefinitionForEvent(
        eventName,
      );

    if (result?.success) {
      this.logger.debug('VC pd retrieved');
      return sendResponse(result.result, 200, null);
    }

    return sendResponse(null, 500, result.error);
  }

  @ApiOperation({
    summary: 'It retrieves whether the verifiable presentation submitted is valid or not',
  })
  @ApiOkResponse({
    status: 200,
    description: 'Verifiable Presentation satisfies presentation definition of interest',
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
  @ApiQuery({
    name: 'signedPresentation',
    description: 'presentation submitted as a signed and encoded JWT',
    required: true,
    type: String,
  })
  @ApiQuery({
    name: 'eventName',
    description: 'Name of the event',
    required: true,
    type: String,
  })
  @Get('evalPS')
  async evalPresentationSubmission(
    @Query('signedPresentation') signedPresentation: string,
    @Query('eventName') eventName: string,
  ) {
    const result =
      await this.issuerAgentService.evaluatesPresentationSubmission(
        signedPresentation,
        eventName,
      );

    if (result?.success) {
      this.logger.debug('verifiable presentation validated');
      return sendResponse(result.result, 200, null);
    }

    return sendResponse(null, 500, result.error);
  }

  @ApiOperation({
    summary: 'Retrieves the credential offer for an attendee credential for a specific event.',
  })
  @ApiOkResponse({
    status: 201,
    description: 'credential offer successfully created and retrieved',
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
  @Post('attendeeCredentialOffer')
  async issueAttendeeCredential(
    @Body('signedPresentation') signedPresentation: string,
    @Body('eventName') eventName: string,
    @Body('data') data: object,
  ) {
    const result = await this.issuerAgentService.createAttendeeCredentialOffer(
      signedPresentation,
      eventName,
      data,
    );

    if (result?.success) {
      this.logger.debug('attendee credential offer is being created');
      return sendResponse(result.result, 201, null);
    }

    return sendResponse(null, 500, result.error);
  }
}
