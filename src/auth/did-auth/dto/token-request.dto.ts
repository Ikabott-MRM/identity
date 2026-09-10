import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class TokenRequestDto {
  @ApiProperty({ example: 'did:dht:...' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^did:/)
  did: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  challengeId: string;

  @ApiProperty({
    description:
      'base64url(Ed25519 detached signature over challenge message UTF-8)',
  })
  @IsString()
  @IsNotEmpty()
  signature: string;
}
