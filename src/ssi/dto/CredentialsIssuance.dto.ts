import { IsDateString, IsNotEmpty, IsObject, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IssueCredentialDto {
  @ApiProperty({ description: 'The data associated with the credential' })
  @IsObject()
  data: any;

  @ApiProperty({
    description: 'The ID of the schema of the credential to be issued',
  })
  @IsString()
  @IsNotEmpty()
  schemaId: string;

  @ApiProperty({ description: 'The DID of the subject' })
  @IsString()
  @IsNotEmpty()
  subjectDid: string;

  @ApiProperty({
    description:
      'The date in which the credential will expire. If no date is provided, no expiration will be set for the JWT token.',
  })
  @IsDateString()
  expDate: string;
}
