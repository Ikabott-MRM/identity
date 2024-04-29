import { Test, TestingModule } from '@nestjs/testing';
import { InviteeController } from './invitee.controller';

describe('InviteeController', () => {
  let controller: InviteeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InviteeController],
    }).compile();

    controller = module.get<InviteeController>(InviteeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
