import {
  Controller,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { sendResponse } from '../helpers/functions';
import { VerificationService } from './verification.service';

@Controller('verifications')
export class VerificationController {
  static readonly MAX_FILE_SIZE = 1048576;

  constructor(private verificationService: VerificationService) {}

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
            maxSize: VerificationController.MAX_FILE_SIZE,
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

    const request = await this.verificationService.createRequest(data);

    return sendResponse(request, 200, 'Request created successfully.');
  }
}
