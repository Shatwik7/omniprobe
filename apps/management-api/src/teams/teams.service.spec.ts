import { Test, TestingModule } from '@nestjs/testing';
import { TeamsService } from './teams.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Team, User } from '@app/database';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('TeamsService', () => {
  let service: TeamsService;
  let repository: Pick<
    Repository<Team>,
    'create' | 'save' | 'findAndCount' | 'findOne' | 'update' | 'delete'
  >;
  let usersRepository: Pick<Repository<User>, 'findOne'>;

  const teamsRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const usersRepositoryMock = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: getRepositoryToken(Team),
          useValue: teamsRepositoryMock,
        },
        {
          provide: getRepositoryToken(User),
          useValue: usersRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
    repository = module.get(getRepositoryToken(Team));
    usersRepository = module.get(getRepositoryToken(User));

    teamsRepositoryMock.create.mockReset();
    teamsRepositoryMock.save.mockReset();
    teamsRepositoryMock.findAndCount.mockReset();
    teamsRepositoryMock.findOne.mockReset();
    teamsRepositoryMock.update.mockReset();
    teamsRepositoryMock.delete.mockReset();
    usersRepositoryMock.findOne.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create should create and persist a team', async () => {
    const createdEntity = { name: 'Platform Team' } as Team;
    const savedEntity = { id: 'team-1', name: 'Platform Team' } as Team;

    teamsRepositoryMock.create.mockReturnValueOnce(createdEntity);
    teamsRepositoryMock.save.mockReturnValueOnce(Promise.resolve(savedEntity));

    const response = await service.create('Platform Team', 'user-1');

    expect(repository.create).toHaveBeenCalledWith({
      name: 'Platform Team',
      createdBy: { id: 'user-1' },
      members: [{ id: 'user-1' }],
    });
    expect(repository.save).toHaveBeenCalledWith(createdEntity);
    expect(response).toEqual(savedEntity);
  });

  it('findAll should return teams and count for member user', async () => {
    const teams = [{ id: 'team-1', name: 'Ops' }] as Team[];
    teamsRepositoryMock.findAndCount.mockReturnValueOnce(
      Promise.resolve([teams, 1]),
    );

    const response = await service.findAll('user-1');

    expect(repository.findAndCount).toHaveBeenCalledWith({
      where: {
        members: {
          id: 'user-1',
        },
      },
      relations: ['members', 'createdBy'],
    });
    expect(response).toEqual({ Teams: teams, Count: 1 });
  });

  it('findOne should load team with expected relations and selects', async () => {
    const team = { id: 'team-1', name: 'Ops' } as Team;
    teamsRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(team));

    const response = await service.findOne('team-1');

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'team-1' },
      relations: ['members', 'projects', 'createdBy'],
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        members: {
          id: true,
          name: true,
          email: true,
        },
        createdBy: {
          id: true,
          name: true,
          email: true,
        },
      },
    });
    expect(response).toEqual(team);
  });

  it('update should save renamed team for creator', async () => {
    const team = {
      id: 'team-1',
      name: 'Ops',
      createdBy: { id: 'user-1' },
      members: [{ id: 'user-1' }],
    } as unknown as Team;
    const saved = { ...team, name: 'Renamed' } as Team;
    teamsRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(team));
    teamsRepositoryMock.save.mockReturnValueOnce(Promise.resolve(saved));

    const response = await service.update('team-1', { name: 'Renamed' }, 'user-1');

    expect(repository.save).toHaveBeenCalled();
    expect(response).toEqual(saved);
  });

  it('update should add a new member when requested by creator', async () => {
    const team = {
      id: 'team-1',
      createdBy: { id: 'user-1' },
      members: [{ id: 'user-1' }],
    } as unknown as Team;
    const addedUser = { id: 'user-2', email: 'u2@example.com' } as User;
    teamsRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(team));
    usersRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(addedUser));
    teamsRepositoryMock.save.mockReturnValueOnce(
      Promise.resolve({ ...team, members: [{ id: 'user-1' }, addedUser] } as unknown as Team),
    );

    await service.update('team-1', { addUserId: 'user-2' }, 'user-1');

    expect(usersRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'user-2' },
    });
    expect(repository.save).toHaveBeenCalled();
  });

  it('update should remove a member when requested by creator', async () => {
    const team = {
      id: 'team-1',
      createdBy: { id: 'user-1' },
      members: [{ id: 'user-1' }, { id: 'user-2' }],
    } as unknown as Team;
    teamsRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(team));
    teamsRepositoryMock.save.mockReturnValueOnce(
      Promise.resolve({ ...team, members: [{ id: 'user-1' }] } as unknown as Team),
    );

    const response = await service.update('team-1', { removeUserId: 'user-2' }, 'user-1');

    expect(response).toEqual(
      expect.objectContaining({ members: [{ id: 'user-1' }] }),
    );
  });

  it('update should throw when team is missing', async () => {
    teamsRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(null));

    await expect(service.update('team-1', { name: 'Renamed' }, 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('update should throw when requester is not creator', async () => {
    teamsRepositoryMock.findOne.mockReturnValueOnce(
      Promise.resolve({
        id: 'team-1',
        createdBy: { id: 'owner-1' },
        members: [{ id: 'owner-1' }, { id: 'user-1' }],
      } as unknown as Team),
    );

    await expect(service.update('team-1', { addUserId: 'user-2' }, 'user-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('update should throw when adding unknown user', async () => {
    teamsRepositoryMock.findOne.mockReturnValueOnce(
      Promise.resolve({
        id: 'team-1',
        createdBy: { id: 'user-1' },
        members: [{ id: 'user-1' }],
      } as unknown as Team),
    );
    usersRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(null));

    await expect(service.update('team-1', { addUserId: 'user-2' }, 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('update should throw when creator tries to remove themselves', async () => {
    teamsRepositoryMock.findOne.mockReturnValueOnce(
      Promise.resolve({
        id: 'team-1',
        createdBy: { id: 'user-1' },
        members: [{ id: 'user-1' }, { id: 'user-2' }],
      } as unknown as Team),
    );

    await expect(service.update('team-1', { removeUserId: 'user-1' }, 'user-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('remove should return true when delete affects rows', async () => {
    const team = {
      id: 'team-1',
      members: [{ id: 'user-1' }],
      createdBy: { id: 'user-1' },
    } as unknown as Team;
    teamsRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(team));
    teamsRepositoryMock.save.mockReturnValueOnce(Promise.resolve(team));
    teamsRepositoryMock.delete.mockReturnValueOnce(
      Promise.resolve({ affected: 1 }),
    );

    const response = await service.remove('team-1', 'user-1');

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'team-1' },
      relations: ['members', 'createdBy'],
    });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ members: [] }),
    );
    expect(repository.delete).toHaveBeenCalledWith({ id: 'team-1' });
    expect(response).toBe(true);
  });

  it('remove should return false when team is not found', async () => {
    teamsRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(null));

    const response = await service.remove('team-1', 'user-1');

    expect(repository.delete).not.toHaveBeenCalled();
    expect(response).toBe(false);
  });

  it('remove should return false when delete affects no rows', async () => {
    const team = {
      id: 'team-1',
      members: [{ id: 'user-1' }],
      createdBy: { id: 'user-1' },
    } as unknown as Team;
    teamsRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(team));
    teamsRepositoryMock.save.mockReturnValueOnce(Promise.resolve(team));
    teamsRepositoryMock.delete.mockReturnValueOnce(
      Promise.resolve({ affected: 0 }),
    );

    const response = await service.remove('team-1', 'user-1');

    expect(response).toBe(false);
  });

  it('remove should throw when requester is not creator', async () => {
    teamsRepositoryMock.findOne.mockReturnValueOnce(
      Promise.resolve({
        id: 'team-1',
        members: [{ id: 'owner-1' }],
        createdBy: { id: 'owner-1' },
      } as unknown as Team),
    );

    await expect(service.remove('team-1', 'user-1')).rejects.toThrow(
      ForbiddenException,
    );
  });
});
