import {
  IsNotEmpty,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CredentialOfferDto {
  @ApiProperty({
    description: `Id of the VC schema`,
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  schemaId: string;

  @ApiProperty({
    description: `Data needed for issuing the credential`,
    type: Object,
  })
  @IsNotEmpty()
  data: Object;
}
