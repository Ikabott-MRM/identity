import {
  Controller,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  Get,
  Query,
  NotFoundException,
  FileTypeValidator,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { sendErrorResponse, sendResponse } from '../helpers/functions';
import {
  RequestAlreadyProcessedError,
  RequestService,
  RequestStatus,
} from './request.service';
import { ActionPayloadDto } from 'src/ssi/dto/ActionPayload.dto';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
@ApiTags('requests')
import { RequestError } from '../helpers/errors';

@Controller('requests')
export class RequestController {
  static readonly MAX_FILE_SIZE = 3145728;
  static readonly ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif'];

  constructor(private requestService: RequestService) {}

  @Post(':id/action')
  @ApiOperation({
    summary: 'It approves or rejects a request',
  })
  @HttpCode(200)
  @ApiParam({
    name: 'id',
    required: true,
    description:
      'Identifier of the request for which an action is going to be applied.',
    schema: { type: 'string' },
  })
  @ApiBody({ type: ActionPayloadDto, description: 'Action payload' })
  @ApiResponse({
    status: 400,
    description:
      'Bad request.Message field on response will provide a more accurate description of it.',
  })
  @ApiResponse({
    status: 409,
    description: 'Request already processed.',
  })
  @ApiResponse({
    status: 404,
    description: 'Request not found.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error. Message field on response will provide a more accurate description of it',
  })
  @ApiOkResponse({
    status: 200,
    description: 'Request approved or rejected successfully.',
  })
  async handleAction(
    @Body() actionPayloadDto: ActionPayloadDto,
    @Param('id') id: string,
  ) {
    let request;
    try {
      if (actionPayloadDto.action === 'approve') {
        if (!actionPayloadDto.identifiable_data) {
          return sendErrorResponse(
            RequestError.IDENTIFIABLE_DATA_MISSING,
            400,
            `Param "identifiable_data" is required.`,
          );
        }

        if (!Boolean(actionPayloadDto.exp_date)) {
          return sendErrorResponse(
            RequestError.EXPIRATION_DATE_REQUIRED,
            400,
            `Expiration date is required for approving a drivers license.`,
          );
        }

        const requiredFields = ['name', 'lastname', 'category'];

        for (const field of requiredFields) {
          if (!actionPayloadDto.identifiable_data[field]) {
            return sendErrorResponse(
              RequestError.IDENTIFIABLE_DATA_FIELD_MISSING,
              400,
              `Field ${field} is required in identifiable_data.`,
            );
          }
        }

        request = await this.requestService.approveRequest(
          id,
          actionPayloadDto.identifiable_data,
          actionPayloadDto.exp_date,
        );
      } else if (actionPayloadDto.action === 'reject') {
        request = await this.requestService.rejectRequest(id);
      } else {
        return sendErrorResponse(
          RequestError.ACTION_INVALID,
          400,
          'Action should be either "approve" or "reject".',
        );
      }

      return sendResponse(
        request,
        200,
        `Request ${actionPayloadDto.action === 'approve' ? 'approved' : 'rejected'} successfully.`,
      );
    } catch (error) {
      if (error instanceof RequestAlreadyProcessedError) {
        return sendErrorResponse(
          RequestError.REQUEST_ALREADY_PROCESSED,
          409,
          'Request already processed.',
        );
      } else if (error instanceof NotFoundException) {
        return sendErrorResponse(
          RequestError.REQUEST_NOT_FOUND,
          404,
          'Request not found.',
        );
      }

      return sendErrorResponse(
        RequestError.UNEXPECTED_ERROR,
        error.status || 500,
        error.message || 'An unexpected error occurred.',
      );
    }
  }

  @Get('/')
  @ApiOperation({
    summary:
      'It retrieves all requests. If query param "status" is provided, it will filter them by "status"',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description:
      'If set, is the status that is going to be used for filtering the requests.',
    schema: { type: 'string' },
    enum: ['pending', 'approved', 'rejected'],
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request.Message field on response will provide a more accurate description of it.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error. Message field on response will provide a more accurate description of it',
  })
  @ApiOkResponse({
    status: 200,
    description: 'Requests retrieved successfully.',
  })
  async getRequests(@Query('status') status: RequestStatus) {
    const validStatuses = [
      RequestStatus.PENDING,
      RequestStatus.APPROVED,
      RequestStatus.REJECTED,
    ];

    if (status && !validStatuses.includes(status)) {
      return sendErrorResponse(
        RequestError.STATUS_INVALID,
        400,
        `Invalid status. Status should be one of: ${validStatuses.join(', ')}`,
      );
    }

    if (status) {
      const requests = await this.requestService.getRequestsWithStatus(status);
      return sendResponse(requests, 200, 'Requests retrieved successfully.');
    }

    const requests = await this.requestService.getRequests();
    return sendResponse(requests, 200, 'Requests retrieved successfully.');
  }

  @Get(':did/requests')
  @ApiOperation({
    summary:
      'It retrieves all requests associated to the DID passed as path parameter.',
  })
  @ApiParam({
    name: 'did',
    required: true,
    description:
      'Decentralized Identifier of the user for who the requests are being fetched.',
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error. Message field on response will provide a more accurate description of it',
  })
  @ApiOkResponse({
    status: 200,
    description: 'Requests retrieved successfully.',
  })
  async getRequestsForDid(@Param('did') did: string) {
    const requests = await this.requestService.getRequestsForSubject(did);
    return sendResponse(requests, 200, 'Requests retrieved successfully.');
  }

  @Post(':did/request')
  @ApiOperation({
    summary:
      'It creates a request associated to the DID passed as path parameter and using the uploaded file .',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
      },
      required: ['file'],
    },
  })
  @ApiParam({
    name: 'did',
    required: true,
    description:
      'Decentralized Identifier of the user for who the request is being created.',
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request.Message field on response will provide a more accurate description of it.',
  })
  @ApiOkResponse({
    status: 201,
    description: 'Request created successfully.',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      dest: 'documents/',
    }),
  )
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: RequestController.MAX_FILE_SIZE,
          }),
          new FileTypeValidator({
            fileType: `.(${RequestController.ALLOWED_IMAGE_EXTENSIONS.join('|')})`,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Param('did') did: string,
  ) {
    const data = {
      schema_id: 'drivers_license',
      subject_did: did,
      document_url: file.path,
    };

    const request = await this.requestService.createRequest(data);

    return sendResponse(request, 201, 'Request created successfully.');
  }
}
