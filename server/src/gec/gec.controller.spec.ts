import { Test, TestingModule } from '@nestjs/testing';
import { GecController } from './gec.controller';

describe('GecController', () => {
let controller: GecController;

beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GecController],
    }).compile();

    controller = module.get<GecController>(GecController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
