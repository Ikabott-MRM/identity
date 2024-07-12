import { IsNotEmpty, ValidateIf, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class IdentifiableDataDto {
  @ApiProperty({
    description:
      'name to be used for issuing the drivers license verifiable credential.',
    required: true,
  })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description:
      'lastname to be used for issuing the drivers license verifiable credential.',
    required: true,
  })
  @IsNotEmpty()
  lastname: string;

  @ApiProperty({
    description:
      'category to be used for issuing the drivers license verifiable credential.',
    required: true,
  })
  @IsNotEmpty()
  category: string;
}

export class ActionPayloadDto {
  @ApiProperty({
    enum: ['approve', 'reject'],
    description: 'Action to be applied on the request.',
  })
  action: 'approve' | 'reject';

  @ApiProperty({
    type: IdentifiableDataDto,
    required: false,
    description:
      'Only needed for approval actions. Is the data to be used for the claims of the verifiable credential that ends up being issued when approving a request.',
  })
  @ValidateIf((o) => o.action === 'approve')
  @ValidateNested()
  @Type(() => IdentifiableDataDto)
  identifiable_data?: IdentifiableDataDto;

  @ApiProperty({
    type: 'string',
    required: false,
    description:
      'Only needed for approval actions. Is the expiration date that is going to be set for the verifiable credential.',
  })
  @ValidateIf((o) => o.action === 'approve')
  @IsNotEmpty()
  exp_date?: string;
}
