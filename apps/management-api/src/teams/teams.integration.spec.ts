import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '@app/database';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

describe('Teams Integration (controller + service + repository)', () => {
  let controller: TeamsController;
  let repository: Pick<
    Repository<Team>,
    'create' | 'save' | 'findAndCount' | 'findOne' | 'update' | 'delete'
  >;

  const repositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [
        TeamsService,
        {
          provide: getRepositoryToken(Team),
          useValue: repositoryMock,
        },
      ],
    }).compile();

    controller = module.get(TeamsController);
    repository = module.get(getRepositoryToken(Team));

    repositoryMock.create.mockReset();
    repositoryMock.save.mockReset();
    repositoryMock.findAndCount.mockReset();
    repositoryMock.findOne.mockReset();
    repositoryMock.update.mockReset();
    repositoryMock.delete.mockReset();
  });

  it('create should flow from controller to repository.save', async () => {
    const created = { name: 'Core Team' } as Team;
    const saved = { id: 'team-1', name: 'Core Team' } as Team;

    repositoryMock.create.mockReturnValueOnce(created);
    repositoryMock.save.mockReturnValueOnce(Promise.resolve(saved));

    const response = await controller.create(
      { name: 'Core Team' },
      { user: { id: 'user-1' } },
    );

    expect(repository.create).toHaveBeenCalledWith({
      name: 'Core Team',
      createdBy: { id: 'user-1' },
      members: [{ id: 'user-1' }],
    });
    expect(repository.save).toHaveBeenCalledWith(created);
    expect(response).toEqual(saved);
  });

  it('findAll should flow from controller to repository.findAndCount', async () => {
    repositoryMock.findAndCount.mockReturnValueOnce(
      Promise.resolve([[{ id: 'team-1', name: 'Core Team' }], 1]),
    );

    const response = await controller.findAll({ user: { id: 'user-1' } });

    expect(repository.findAndCount).toHaveBeenCalledWith({
      where: { members: { id: 'user-1' } },
      relations: ['members', 'createdBy'],
    });
    expect(response).toEqual({
      Teams: [{ id: 'team-1', name: 'Core Team' }],
      Count: 1,
    });
  });

  it('findOne should flow from controller to repository.findOne', async () => {
    repositoryMock.findOne.mockReturnValueOnce(
      Promise.resolve({ id: 'team-1', name: 'Core Team' }),
    );

    const response = await controller.findOne('team-1');

    expect(repository.findOne).toHaveBeenCalled();
    expect(response).toEqual({ id: 'team-1', name: 'Core Team' });
  });

  it('update and remove should flow to repository update/delete', async () => {
    repositoryMock.update.mockReturnValueOnce(Promise.resolve({ affected: 1 }));
    repositoryMock.findOne.mockReturnValueOnce(
      Promise.resolve({
        id: 'team-1',
        members: [{ id: 'user-1' }],
      } as unknown as Team),
    );
    repositoryMock.save.mockReturnValueOnce(
      Promise.resolve({ id: 'team-1', members: [] } as unknown as Team),
    );
    repositoryMock.delete.mockReturnValueOnce(Promise.resolve({ affected: 1 }));

    const updateResponse = await controller.update('team-1', {
      name: 'Updated Team',
    });
    const deleteResponse = await controller.remove('team-1');

    expect(repository.update).toHaveBeenCalledWith('team-1', {
      name: 'Updated Team',
    });
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'team-1' },
      relations: ['members'],
    });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ members: [] }),
    );
    expect(repository.delete).toHaveBeenCalledWith({ id: 'team-1' });
    expect(updateResponse).toEqual({ affected: 1 });
    expect(deleteResponse).toBe(true);
  });
});
