import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ChallengeRequestDto {
  @ApiProperty({ example: 'did:dht:...' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^did:/)
  did: string;
}
