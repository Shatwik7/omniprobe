import { Test, TestingModule } from '@nestjs/testing';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import {describe, beforeEach, it, expect, jest} from '@jest/globals';
import { Team } from '@app/database';


describe('TeamsController', () => {
  let controller: TeamsController;
  let teamsService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const teamsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [
        {
          provide: TeamsService,
          useValue: teamsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<TeamsController>(TeamsController);
    teamsService = module.get(TeamsService);

    teamsServiceMock.create.mockReset();
    teamsServiceMock.findAll.mockReset();
    teamsServiceMock.findOne.mockReset();
    teamsServiceMock.update.mockReset();
    teamsServiceMock.remove.mockReset();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should delegate to teamsService.create', async () => {
    const team = { id: 'team-1', name: 'Ops' } as Team;
    teamsService.create.mockReturnValueOnce(Promise.resolve(team));

    const response = await controller.create(
      { name: 'Ops' },
      { user: { id: 'user-1' } },
    );

    expect(teamsService.create).toHaveBeenCalledWith('Ops', 'user-1');
    expect(response).toEqual(team);
  });

  it('findAll should delegate to teamsService.findAll', async () => {
    const result = { Teams: [{ id: 'team-1', name: 'Ops' }], Count: 1 };
    teamsService.findAll.mockReturnValueOnce(Promise.resolve(result));

    const response = await controller.findAll({ user: { id: 'user-1' } });

    expect(teamsService.findAll).toHaveBeenCalledWith('user-1');
    expect(response).toEqual(result);
  });

  it('findOne should delegate to teamsService.findOne', async () => {
    const team = { id: 'team-1', name: 'Ops' };
    teamsService.findOne.mockReturnValueOnce(Promise.resolve(team));

    const response = await controller.findOne('team-1');

    expect(teamsService.findOne).toHaveBeenCalledWith('team-1');
    expect(response).toEqual(team);
  });

  it('update should delegate to teamsService.update', async () => {
    const updateResult = { affected: 1 };
    teamsService.update.mockReturnValueOnce(Promise.resolve(updateResult));

    const response = await controller.update('team-1', { name: 'Platform' });

    expect(teamsService.update).toHaveBeenCalledWith('team-1', { name: 'Platform' });
    expect(response).toEqual(updateResult);
  });

  it('remove should delegate to teamsService.remove', async () => {
    teamsService.remove.mockReturnValueOnce(Promise.resolve(true));

    const response = await controller.remove('team-1');

    expect(teamsService.remove).toHaveBeenCalledWith('team-1');
    expect(response).toBe(true);
  });
});
