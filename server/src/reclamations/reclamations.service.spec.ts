import { Test, TestingModule } from '@nestjs/testing';
import { ReclamationsService } from './reclamations.service';

describe('ReclamationsService', () => {
  let service: ReclamationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReclamationsService],
    }).compile();

    service = module.get<ReclamationsService>(ReclamationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
