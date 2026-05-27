import { IsNotEmpty, IsObject, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActionPayloadDto {
  @ApiProperty({
    enum: ['approve', 'reject'],
    description: 'Action to be applied on the request.',
  })
  action: 'approve' | 'reject';

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    required: false,
    description:
      'Only needed for approval actions. Is the data to be used for the claims of the verifiable credential that ends up being issued when approving a request.',
  })
  @ValidateIf(o => o.action === 'approve')
  @IsObject()
  identifiable_data?: Record<string, string>;

  @ApiProperty({
    type: 'string',
    required: false,
    description:
      'Only needed for approval actions. Is the expiration date that is going to be set for the verifiable credential.',
  })
  @ValidateIf(o => o.action === 'approve')
  @IsNotEmpty()
  exp_date?: string;
}
