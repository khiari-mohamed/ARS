import { Test, TestingModule } from '@nestjs/testing';
import { GedController } from './ged.controller';

describe('GedController', () => {
  let controller: GedController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GedController],
    }).compile();

    controller = module.get<GedController>(GedController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
