import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { sendErrorResponse } from '../../../helpers/functions';
import { RequestError } from '../../../helpers/errors';
import { EmailService } from './email.service';
import { BackupEmailDto } from './dto/BackupEmailDto.dto';

@ApiTags('email')
@ApiSecurity('api-key')
@Controller('email')
export class EmailController {
  private readonly logger: Logger = new Logger(EmailController.name);
  constructor(private readonly emailService: EmailService) {}

  @Post('/back-up')
  @ApiOperation({
    summary:
      'It sends an email with the file needed for DID retrieval attached. The recipient is the email address provided by the user during the backup process in the app.',
  })
  @ApiOkResponse({
    status: 200,
    description: 'Email successfully sent.',
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
  async sendEmailWithAttachment(@Body() backUpEmail: BackupEmailDto) {
    const result = await this.emailService.sendEmailWithAttachment(
      backUpEmail.to,
      backUpEmail.jsonContent,
      backUpEmail.verificationCode,
    );

    if (result?.success) {
      this.logger.debug(
        `Email successfully sent to recipient with backup file attached.`,
      );
    }
    if (result.code) {
      return { code: result.code, error: result.error };
    }
    return sendErrorResponse(RequestError.UNEXPECTED_ERROR, 500, result.error);
  }
}
