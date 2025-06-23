import { Test, TestingModule } from '@nestjs/testing';
import { TraitementService } from './traitement.service';

describe('TraitementService', () => {
  let service: TraitementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TraitementService],
    }).compile();

    service = module.get<TraitementService>(TraitementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
