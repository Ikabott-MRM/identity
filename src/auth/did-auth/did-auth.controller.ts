import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DidAuthService } from './did-auth.service';
import { ChallengeRequestDto } from './dto/challenge-request.dto';
import { TokenRequestDto } from './dto/token-request.dto';

@ApiTags('did-auth')
@Controller('auth/did')
export class DidAuthController {
  constructor(private readonly didAuthService: DidAuthService) {}

  @Post('challenge')
  @HttpCode(200)
  @ApiOperation({ summary: 'Create a Proof-of-DID challenge for a subject DID' })
  @ApiOkResponse({ description: 'Challenge created' })
  async createChallenge(@Body() body: ChallengeRequestDto) {
    return this.didAuthService.createChallenge(body.did);
  }

  @Post('token')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Exchange a signed DID challenge for a short-lived JWT',
  })
  @ApiOkResponse({ description: 'Access token issued' })
  async exchangeToken(@Body() body: TokenRequestDto) {
    return this.didAuthService.exchangeToken({
      did: body.did,
      challengeId: body.challengeId,
      signature: body.signature,
    });
  }
}
