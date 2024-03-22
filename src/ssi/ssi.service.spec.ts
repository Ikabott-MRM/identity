import { Test, TestingModule } from '@nestjs/testing';
import { SsiService } from './ssi.service';

describe('SsiService', () => {
  let service: SsiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SsiService],
    }).compile();

    service = module.get<SsiService>(SsiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
