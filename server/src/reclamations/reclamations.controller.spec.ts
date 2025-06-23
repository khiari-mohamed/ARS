import { Test, TestingModule } from '@nestjs/testing';
import { ReclamationsController } from './reclamations.controller';

describe('ReclamationsController', () => {
  let controller: ReclamationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReclamationsController],
    }).compile();

    controller = module.get<ReclamationsController>(ReclamationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
