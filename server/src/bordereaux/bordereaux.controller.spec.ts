import { Test, TestingModule } from '@nestjs/testing';
import { BordereauxController } from './bordereaux.controller';

describe('BordereauxController', () => {
  let controller: BordereauxController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BordereauxController],
    }).compile();

    controller = module.get<BordereauxController>(BordereauxController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
