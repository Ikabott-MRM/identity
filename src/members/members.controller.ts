import { Controller, Post } from '@nestjs/common';
import { MembersService } from './members.service';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post('validate')
  async sendVerificationCode(email: string, code: string): Promise<void> {
    await this.membersService.sendVerificationCode(email);
  }

  @Post('verify')
  async verifyCode(email: string, code: string): Promise<boolean> {
    return await this.verifyCode(email, code);
  }
}
