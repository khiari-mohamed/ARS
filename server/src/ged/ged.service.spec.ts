import { Test, TestingModule } from '@nestjs/testing';
import { GedService } from './ged.service';

describe('GedService', () => {
  let service: GedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GedService],
    }).compile();

    service = module.get<GedService>(GedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
