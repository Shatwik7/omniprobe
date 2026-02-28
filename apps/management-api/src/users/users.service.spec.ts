import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import {describe, beforeEach, it, expect, jest} from '@jest/globals';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '@app/database';
import { Repository } from 'typeorm';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Pick<Repository<User>, 'find' | 'findOne' | 'delete'>;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(getRepositoryToken(User));

    mockRepository.find.mockReset();
    mockRepository.findOne.mockReset();
    mockRepository.delete.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAll should query repository with relations and paging', async () => {
    mockRepository.find.mockReturnValueOnce(Promise.resolve([]));

    const response = await service.findAll(2, 5);

    expect(repository.find).toHaveBeenCalledWith({
      relations: ['createdTeams', 'teams'],
      skip: 10,
      take: 5,
    });
    expect(response).toBeUndefined();
  });

  it('findOne should query repository by id', async () => {
    const user = { id: 'user-1', email: 'test@local', name: 'Test' } as User;
    mockRepository.findOne.mockReturnValueOnce(Promise.resolve(user));

    const response = await service.findOne('user-1');

    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    expect(response).toEqual(user);
  });

  it('update should return the current placeholder message', () => {
    const response = service.update(42, { name: 'Updated User' });

    expect(response).toBe('This action updates a #42 user');
  });

  it('remove should return true when a row is deleted', async () => {
    mockRepository.delete.mockReturnValueOnce(Promise.resolve({ affected: 1 }));

    const response = await service.remove('user-1');

    expect(repository.delete).toHaveBeenCalledWith({ id: 'user-1' });
    expect(response).toBe(true);
  });

  it('remove should return false when no rows are deleted', async () => {
    mockRepository.delete.mockReturnValueOnce(Promise.resolve({ affected: 0 }));

    const response = await service.remove('user-1');

    expect(response).toBe(false);
  });
});
