import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@app/database';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';

describe('Users Integration (controller + service + auth contract)', () => {
  let controller: UsersController;
  let repository: Pick<Repository<User>, 'findOne' | 'delete'>;
  let authService: { register: jest.Mock; createAccessToken: jest.Mock };

  const repositoryMock = {
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const authServiceMock = {
    register: jest.fn(),
    createAccessToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
        {
          provide: getRepositoryToken(User),
          useValue: repositoryMock,
        },
      ],
    }).compile();

    controller = module.get(UsersController);
    repository = module.get(getRepositoryToken(User));
    authService = module.get(AuthService);

    repositoryMock.find.mockReset();
    repositoryMock.findOne.mockReset();
    repositoryMock.delete.mockReset();
    authServiceMock.register.mockReset();
    authServiceMock.createAccessToken.mockReset();
  });

  it('signup and signin should use auth service contract', async () => {
    const dto = { name: 'Integration', email: 'i@test.com', password: 'secret123' };
    const user = { id: 'i-1', name: 'Integration', email: 'i@test.com' };

    authService.register.mockReturnValueOnce(Promise.resolve(user));
    authService.createAccessToken.mockReturnValueOnce({ access_token: 'token-1' });

    const signupResponse = await controller.create(dto);
    const signinResponse = controller.login({ user: user as User });

    expect(signupResponse).toEqual(user);
    expect(signinResponse).toEqual({ access_token: 'token-1' });
  });

  it('findme should flow through service into repository', async () => {
    const user = { id: 'u-99', email: 'flow@test.com', name: 'Flow' };
    repositoryMock.findOne.mockReturnValueOnce(Promise.resolve(user));

    const response = await controller.findme({ user: { id: 'u-99' } });

    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'u-99' } });
    expect(response).toEqual(user);
  });

  it('remove should flow through service into repository.delete', async () => {
    repositoryMock.delete.mockReturnValueOnce(Promise.resolve({ affected: 1 }));

    const response = await controller.remove('u-99');

    expect(repository.delete).toHaveBeenCalledWith({ id: 'u-99' });
    expect(response).toBe(true);
  });
});
