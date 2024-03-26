import { IsArray, IsNotEmpty, IsString, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDIDDto {
  @ApiProperty({
    description: `DID method to be used`,
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  didMethod: string;

  //   @ApiProperty({
  //     description: `SSI Project name to be used for creating the DID (quarkid, tbd, etc)`,
  //     type: String,
  //   })
  //   @IsNotEmpty()
  //   @IsString()
  //   ssiProjectName: string;
}
