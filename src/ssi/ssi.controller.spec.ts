import { Test, TestingModule } from '@nestjs/testing';
import { SsiController } from './ssi.controller';

describe('SsiController', () => {
  let controller: SsiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SsiController],
    }).compile();

    controller = module.get<SsiController>(SsiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
