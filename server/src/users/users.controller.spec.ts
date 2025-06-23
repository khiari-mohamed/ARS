import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
describe('UsersController', () => {
  let controller: UsersController;
  let usersService: Partial<UsersService>;

  beforeEach(async () => {
    usersService = {
      findById: jest.fn(),
    };

    const mockJwtAuthGuard = {
      canActivate: jest.fn().mockReturnValue(true),
    };

    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should return user without password if found', async () => {
    const user = { id: '1', username: 'test', password: 'secret', email: 'a@b.com' };
    (usersService.findById as jest.Mock).mockResolvedValue(user);

    const result = await controller.getUser('1');
    expect(result).toEqual({ id: '1', username: 'test', email: 'a@b.com' });
    expect(result).not.toHaveProperty('password');
  });

  it('should return null if user not found', async () => {
    (usersService.findById as jest.Mock).mockResolvedValue(null);
    const result = await controller.getUser('2');
    expect(result).toBeNull();
  });
});
