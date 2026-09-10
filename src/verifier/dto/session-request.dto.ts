import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SessionRequestDto {
  @ApiProperty({ description: 'Verifier company activation code' })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  code: string;
}
