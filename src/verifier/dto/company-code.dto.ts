import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CompanyCodeDto {
  @ApiProperty({ description: 'New verifier company activation code (plaintext; stored hashed)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  code: string;
}
