import { Test, TestingModule } from '@nestjs/testing';
import { TeamsService } from './teams.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Team } from '@app/database';
import {describe, beforeEach, it, expect, jest} from '@jest/globals';
import { Repository } from 'typeorm';

describe('TeamsService', () => {
  let service: TeamsService;
  let repository: Pick<Repository<Team>, 'create' | 'save' | 'findAndCount' | 'findOne' | 'update' | 'delete'>;

  const teamsRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: getRepositoryToken(Team),
          useValue: teamsRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
    repository = module.get(getRepositoryToken(Team));

    teamsRepositoryMock.create.mockReset();
    teamsRepositoryMock.save.mockReset();
    teamsRepositoryMock.findAndCount.mockReset();
    teamsRepositoryMock.findOne.mockReset();
    teamsRepositoryMock.update.mockReset();
    teamsRepositoryMock.delete.mockReset();
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
    teamsRepositoryMock.findAndCount.mockReturnValueOnce(Promise.resolve([teams, 1]));

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

  it('update should delegate to repository.update', async () => {
    const updateResult = { affected: 1 };
    teamsRepositoryMock.update.mockReturnValueOnce(Promise.resolve(updateResult));

    const response = await service.update('team-1', { name: 'Renamed' });

    expect(repository.update).toHaveBeenCalledWith('team-1', { name: 'Renamed' });
    expect(response).toEqual(updateResult);
  });

  it('remove should return true when delete affects rows', async () => {
    const team = { id: 'team-1', members: [{ id: 'user-1' }] } as unknown as Team;
    teamsRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(team));
    teamsRepositoryMock.save.mockReturnValueOnce(Promise.resolve(team));
    teamsRepositoryMock.delete.mockReturnValueOnce(Promise.resolve({ affected: 1 }));

    const response = await service.remove('team-1');

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'team-1' },
      relations: ['members'],
    });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ members: [] }));
    expect(repository.delete).toHaveBeenCalledWith({ id: 'team-1' });
    expect(response).toBe(true);
  });

  it('remove should return false when team is not found', async () => {
    teamsRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(null));

    const response = await service.remove('team-1');

    expect(repository.delete).not.toHaveBeenCalled();
    expect(response).toBe(false);
  });

  it('remove should return false when delete affects no rows', async () => {
    const team = { id: 'team-1', members: [{ id: 'user-1' }] } as unknown as Team;
    teamsRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(team));
    teamsRepositoryMock.save.mockReturnValueOnce(Promise.resolve(team));
    teamsRepositoryMock.delete.mockReturnValueOnce(Promise.resolve({ affected: 0 }));

    const response = await service.remove('team-1');

    expect(response).toBe(false);
  });
});
