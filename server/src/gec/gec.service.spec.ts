import { Test, TestingModule } from '@nestjs/testing';
import { GecService } from './gec.service';

describe('GecService', () => {
  let service: GecService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GecService],
    }).compile();

    service = module.get<GecService>(GecService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
