import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, ValidateNested } from 'class-validator';

class ContentDto {
  @ApiProperty({
    description:
      'salt used to derived the key from the user password used to encrypt the portable did for back up. ',
    required: true,
  })
  @IsNotEmpty()
  salt: string;

  @ApiProperty({
    description:
      'Initialization vector used for encrypting the portable did for back up.',
    required: true,
  })
  @IsNotEmpty()
  iv: string;

  @ApiProperty({
    description: 'Encrypted portable DID.',
    required: true,
  })
  @IsNotEmpty()
  encryptedData: string;
}

export class BackupEmailDto {
  @ApiProperty({
    type: 'string',
    required: true,
    description: 'Recipient of the email.',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  to: string;

  @ApiProperty({
    type: ContentDto,
    required: true,
    description:
      'Is the data to be used for forming the file that is going to be sent attached on the email.',
  })
  @ValidateNested()
  @Type(() => ContentDto)
  jsonContent: ContentDto;

  @ApiProperty({
    type: 'string',
    required: true,
    description: 'Verification code to be sent on email body.',
  })
  @IsNotEmpty()
  verificationCode: string;
}
