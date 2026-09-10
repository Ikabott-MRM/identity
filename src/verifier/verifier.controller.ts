import { Body, Controller, Get, HttpCode, Put, Post } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { VerifierSessionService } from './verifier-session.service';
import { SessionRequestDto } from './dto/session-request.dto';
import { CompanyCodeDto } from './dto/company-code.dto';

@ApiTags('verifier')
@ApiSecurity('api-key')
@Controller('verifier')
export class VerifierController {
  constructor(private readonly verifierSessionService: VerifierSessionService) {}

  @Post('session')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Exchange company activation code for a short-lived verifier session JWT',
  })
  @ApiOkResponse({ description: 'Verifier session issued' })
  async createSession(@Body() body: SessionRequestDto) {
    return this.verifierSessionService.createSession(body.code);
  }

  @Put('company-code')
  @ApiOperation({
    summary: 'Set or rotate the Verifier company activation code (Emisor)',
  })
  @ApiOkResponse({ description: 'Company code updated' })
  async setCompanyCode(@Body() body: CompanyCodeDto) {
    return this.verifierSessionService.setCompanyCode(body.code);
  }

  @Get('company-code')
  @ApiOperation({
    summary:
      'Company code status for Emisor (returns decrypted code when encrypted_code present)',
  })
  @ApiOkResponse({ description: 'Configuration status and optional code' })
  async getCompanyCodeStatus() {
    return this.verifierSessionService.getStatus();
  }
}
