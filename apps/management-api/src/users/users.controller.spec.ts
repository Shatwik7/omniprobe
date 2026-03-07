import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '@app/database';
import { ForbiddenException } from '@nestjs/common';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let authService: {
    register: jest.Mock<
      (dto: any) => Promise<{ id: string; name: string; email: string }>
    >;
    createAccessToken: jest.Mock;
  };

  const usersServiceMock = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const authServiceMock = {
    register:
      jest.fn<() => Promise<{ id: string; name: string; email: string }>>(),
    createAccessToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
    authService = module.get(AuthService);

    usersServiceMock.findAll.mockReset();
    usersServiceMock.findOne.mockReset();
    usersServiceMock.update.mockReset();
    usersServiceMock.remove.mockReset();
    authServiceMock.register.mockReset();
    authServiceMock.createAccessToken.mockReset();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should call authService.register', async () => {
    const dto = { name: 'A', email: 'a@test.com', password: 'secret123' };
    const created = { id: 'u-1', name: 'A', email: 'a@test.com' };
    authService.register.mockReturnValueOnce(Promise.resolve(created));

    const response = await controller.create(dto);

    expect(authService.register).toHaveBeenCalledWith(dto);
    expect(response).toEqual(created);
  });

  it('login should return token from authService', () => {
    const user = { id: 'u-1', email: 'a@test.com', name: 'A' } as User;
    const token = { access_token: 'token-value' };
    authService.createAccessToken.mockReturnValueOnce(token);

    const response = controller.login({ user });

    expect(authService.createAccessToken).toHaveBeenCalledWith(user);
    expect(response).toEqual(token);
  });

  it('findAll should throw when take is greater than 100', () => {
    expect(() =>
      controller.findAll({ query: { page: 0, limit: 10 } }, 101, 0),
    ).toThrow(ForbiddenException);
  });

  it('findAll should delegate to usersService with request pagination', async () => {
    usersService.findAll.mockReturnValueOnce(Promise.resolve([]));

    const req = { query: { page: 2, limit: 5 } };
    await controller.findAll(req, 10, 0);

    expect(usersService.findAll).toHaveBeenCalledWith(2, 5);
  });

  it('findme should query current user', async () => {
    const user = { id: 'u-1' };
    usersService.findOne.mockReturnValueOnce(Promise.resolve(user));

    const response = await controller.findme({ user: { id: 'u-1' } });

    expect(usersService.findOne).toHaveBeenCalledWith('u-1');
    expect(response).toEqual(user);
  });

  it('findOne should delegate by id', async () => {
    const user = { id: 'u-1' };
    usersService.findOne.mockReturnValueOnce(Promise.resolve(user));

    const response = await controller.findOne('u-1');

    expect(usersService.findOne).toHaveBeenCalledWith('u-1');
    expect(response).toEqual(user);
  });

  it('update should delegate using numeric coercion', () => {
    usersService.update.mockReturnValueOnce('updated');

    const response = controller.update('42', { name: 'Changed' });

    expect(usersService.update).toHaveBeenCalledWith(42, { name: 'Changed' });
    expect(response).toBe('updated');
  });

  it('remove should delegate to usersService.remove', async () => {
    usersService.remove.mockReturnValueOnce(Promise.resolve(true));

    const response = await controller.remove('u-1');

    expect(usersService.remove).toHaveBeenCalledWith('u-1');
    expect(response).toBe(true);
  });
});
