import {
  Controller,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
  Get,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { sendResponse } from '../helpers/functions';
import {
  IdentifiableData,
  RequestAlreadyProcessedError,
  RequestService,
  RequestStatus,
} from './request.service';
import { ApiOkResponse, ApiResponse } from '@nestjs/swagger';

@Controller('requests')
export class RequestController {
  static readonly MAX_FILE_SIZE = 1048576;

  constructor(private requestService: RequestService) {}

  @ApiResponse({
    status: 400,
    description: 'Bad request.',
  })
  @ApiOkResponse({
    status: 201,
    description: 'Request approved or rejected successfully.',
  })
  @Post(':id/action')
  async handleAction(
    @Param('id') id: string,
    @Body('action') action: 'approve' | 'reject',
    @Body('identifiable_data') identifiableData: IdentifiableData,
  ) {
    let request;

    if (!identifiableData) {
      throw new BadRequestException('Param "identifiable_data" is required.');
    }

    const requiredFields = ['name', 'lastname', 'category'];

    for (const field of requiredFields) {
      if (!identifiableData[field]) {
        throw new BadRequestException(
          `Field ${field} is required in identifiable_data.`,
        );
      }
    }

    if (action === 'approve') {
      try {
        request = await this.requestService.approveRequest(
          id,
          identifiableData,
        );
      } catch (error) {
        if (error instanceof RequestAlreadyProcessedError) {
          return sendResponse({}, 409, 'Request already processed.');
        }

        return sendResponse(
          {},
          error.status || 500,
          error.message || 'An unexpected error occurred.',
        );
      }
    } else if (action === 'reject') {
      request = await this.requestService.rejectRequest(id);
    } else {
      return sendResponse(
        {},
        400,
        'Action should be either "approve" or "reject".',
      );
    }

    return sendResponse(
      request,
      200,
      `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
    );
  }

  @Get('/')
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
      return sendResponse(
        {},
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
  @ApiOkResponse({
    status: 200,
    description: 'Requests retrieved successfully.',
  })
  async getRequestsForDid(@Param('did') did: string) {
    const requests = await this.requestService.getRequestsForSubject(did);
    return sendResponse(requests, 200, 'Requests retrieved successfully.');
  }

  @Post(':did/request')
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

    return sendResponse(request, 200, 'Request created successfully.');
  }
}