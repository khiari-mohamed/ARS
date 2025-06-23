import { Test, TestingModule } from '@nestjs/testing';
import { TraitementController } from './traitement.controller';

describe('TraitementController', () => {
  let controller: TraitementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TraitementController],
    }).compile();

    controller = module.get<TraitementController>(TraitementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
