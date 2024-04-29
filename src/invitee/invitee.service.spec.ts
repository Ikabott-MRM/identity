import { Test, TestingModule } from '@nestjs/testing';
import { InviteeService } from './invitee.service';

describe('InviteeService', () => {
  let service: InviteeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InviteeService],
    }).compile();

    service = module.get<InviteeService>(InviteeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
