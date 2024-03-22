import { Body, Controller, Get, Post } from '@nestjs/common';
import { MembersService } from './members.service';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SendVerificationCode {
  @IsEmail()
  email: string;
}

export class VerifyCode {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}

export class Member {
  email: string;
  name: string;
}

export class VerifyCodeResponse {
  valid: boolean;
  member: Member;
}

export class GetCredentialsResponse {
  credentials: string;
}

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post('validate')
  async sendVerificationCode(@Body() req: SendVerificationCode): Promise<void> {
    await this.membersService.sendVerificationCode(req.email);
  }

  @Post('verify')
  async verifyCode(@Body() req: VerifyCode): Promise<VerifyCodeResponse> {
    const res = new VerifyCodeResponse();
    res.valid = await this.membersService.isCodeValid(req.email, req.code);
    // TODO: Create VC (member) and DID (for user) if valid
    if (res.valid) {
      res.member = await this.membersService.createMember(
        req.email,
        'Ext. Name',
      );
    }
    return res;
  }

  // /members/{memberId}/credentials
  @Get(':memberId/credentials')
  async getCredentials(): Promise<void> {
    // Query VC for member
    return null;
  }

  // /members/{memberId}/presentations/event/{eventId}
  @Post(':memberId/presentations/event/:eventId')
  async createPresentation(): Promise<void> {
    // Validate VC for member from DID (from req)
    // If VC is of invitation type -> invalidate VC
    // Generate a new presentation VC for the event and assign to member
    return null;
  }
}
