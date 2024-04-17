import { Test, TestingModule } from '@nestjs/testing';
import { SSiController } from './ssi.controller';

describe('SSiController', () => {
  let controller: SSiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SSiController],
    }).compile();

    controller = module.get<SSiController>(SSiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
