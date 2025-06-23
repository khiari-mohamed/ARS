import { Test, TestingModule } from '@nestjs/testing';
import { BordereauxService } from './bordereaux.service';

describe('BordereauxService', () => {
  let service: BordereauxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BordereauxService],
    }).compile();

    service = module.get<BordereauxService>(BordereauxService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
