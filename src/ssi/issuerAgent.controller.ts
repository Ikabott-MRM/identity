import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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
import { sendErrorResponse, sendResponse } from 'src/helpers/functions';
import { IssuerAgentService } from './issuerAgent.service';
import {
  CredentialOfferDto,
  IssueCredentialDto,
} from './dto/CredentialsIssuance.dto';
import { RequestError } from '../helpers/errors';

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
  @Post('did')
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
    return sendErrorResponse(RequestError.UNEXPECTED_ERROR, 500, result.error);
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
  @Post('credential-offer')
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
    return sendErrorResponse(RequestError.UNEXPECTED_ERROR, 500, result.error);
  }

  @ApiOperation({
    summary:
      'Issues the VC using its schema Id, the DID of its intended holder and the data for forming the claims.',
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
  @ApiBody({
    type: IssueCredentialDto,
    description: 'Data needed for issuing a new credential',
  })
  @Post('credential')
  async issueCredential(@Body() issueCredentialDto: IssueCredentialDto) {
    const { data, schemaId, subjectDid, expDate } = issueCredentialDto;

    if (!schemaId)
      return sendResponse(
        RequestError.SCHEMA_ID_MISSING,
        400,
        `schemaId must be provided in the body of the request.`,
      );
    if (!subjectDid)
      return sendResponse(
        RequestError.SUBJECT_DID_MISSING,
        400,
        `subjectDid must be provided in the body of the request.`,
      );

    const result = await this.issuerAgentService.issueCredential(
      data,
      expDate,
      schemaId,
      subjectDid,
    );

    if (result?.success) {
      this.logger.debug('VC successfully issued');
      return sendResponse(result.result, 200, 'vc successfully issued');
    }
    return sendErrorResponse(RequestError.UNEXPECTED_ERROR, 500, result.error);
  }

  @ApiOperation({
    summary:
      'Issues the VC using its credential offer and the DID of its intended holder.',
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
  @Post('credential/:offerId')
  async issueCredentialGivenOfferId(
    @Param('offerId') offerId: string,
    @Body('subjectDid') subjectDid: string,
  ) {
    if (!offerId)
      return sendErrorResponse(
        RequestError.OFFER_ID_MISSING,
        400,
        `offerId must be provided in the body of the request.`,
      );
    if (!subjectDid)
      return sendErrorResponse(
        RequestError.SUBJECT_DID_MISSING,
        400,
        `subjectDid must be provided in the body of the request.`,
      );
    const result = await this.issuerAgentService.issueCredentialGivenOfferId(
      offerId,
      subjectDid,
    );

    if (result?.success) {
      this.logger.debug('VC successfully issued');
      return sendResponse(result.result, 200, 'vc successfully issued');
    }
    return sendErrorResponse(RequestError.UNEXPECTED_ERROR, 500, result.error);
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
    name: 'issuerDid',
    description:
      'Did of the issuer that needs to be added as constraint to the presentation definition',
    required: false,
    type: String,
  })
  @Get('presentation-definition')
  async getPresentationDefinition(
    @Query('issuerDid') issuerDid: string,
    @Query('pdId') pdId: string,
  ) {
    if (!pdId)
      return sendErrorResponse(
        RequestError.PD_ID_MISSING,
        400,
        `pdId cannot be undefined. A value must be passed as query parameter`,
      );

    const result = await this.issuerAgentService.getPresentationDefinition(
      issuerDid,
      pdId,
    );

    if (result?.success) {
      this.logger.debug('VC pd retrieved');
      return sendResponse(result.result, 200, null);
    }

    return sendErrorResponse(RequestError.UNEXPECTED_ERROR, 500, result.error);
  }

  @ApiOperation({
    summary:
      'It retrieves whether the verifiable presentation submitted is valid or not',
  })
  @ApiOkResponse({
    status: 200,
    description:
      'Verifiable Presentation satisfies presentation definition of interest',
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
    name: 'pdId',
    description: 'ID of the presentation definition',
    required: true,
    type: String,
  })
  @ApiQuery({
    name: 'issuerDid',
    description:
      'Did of the issuer that needs to be added as constraint to the presentation definition',
    required: false,
    type: String,
  })
  @Get('eval-ps')
  async evalPresentationSubmission(
    @Query('signedPresentation') signedPresentation: string,
    @Query('issuerDid') issuerDid: string,
    @Query('pdId') pdId: string,
  ) {
    if (!pdId)
      return sendErrorResponse(
        RequestError.PD_ID_MISSING,
        400,
        `pdId cannot be undefined. A value must be passed as query parameter`,
      );
    if (!signedPresentation)
      return sendErrorResponse(
        RequestError.SIGNED_PRESENTATION_MISSING,
        400,
        `signedPresentation cannot be undefined. A value must be passed as query parameter`,
      );

    const result =
      await this.issuerAgentService.evaluatesPresentationSubmission(
        signedPresentation,
        issuerDid,
        pdId,
      );

    if (result?.success) {
      this.logger.debug('verifiable presentation validated');
      return sendResponse(result.result, 200, null);
    }

    return sendErrorResponse(RequestError.UNEXPECTED_ERROR, 500, result.error);
  }

  @ApiOperation({
    summary: 'It retrieves issuer public key',
  })
  @ApiOkResponse({
    status: 200,
    description: `Issuer's PK successfully retrieved`,
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
  @Get('issuerPubK')
  async getIssuerPublicJWKey() {
    const result = await this.issuerAgentService.getIssuerPublicJWKey();

    if (result?.success) {
      this.logger.debug(`Issuer's PK successfully retrieved`);
      return sendResponse(result.result, 200, null);
    }
    return sendErrorResponse(RequestError.UNEXPECTED_ERROR, 500, result.error);
  }
}
