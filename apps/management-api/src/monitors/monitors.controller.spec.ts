import { Test, TestingModule } from '@nestjs/testing';
import { MonitorsController } from './monitors.controller';
import { MonitorsService } from './monitors.service';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMemberGuard } from '../auth/guards/teamMember.guard';

describe('MonitorsController', () => {
  let controller: MonitorsController;
  let monitorsService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const monitorsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitorsController],
      providers: [
        {
          provide: MonitorsService,
          useValue: monitorsServiceMock,
        },
        {
          provide: 'KAFKA_PRODUCER',
          useValue: { emit: jest.fn() },
        }
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TeamMemberGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MonitorsController>(MonitorsController);
    monitorsService = module.get(MonitorsService);

    monitorsServiceMock.create.mockReset();
    monitorsServiceMock.findAll.mockReset();
    monitorsServiceMock.findOne.mockReset();
    monitorsServiceMock.update.mockReset();
    monitorsServiceMock.remove.mockReset();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should delegate to monitorsService.create', async () => {
    const dto = {
      name: 'API Health',
      target: 'https://example.com/health',
      method: 'GET',
      frequencySeconds: 60,
      projectId: 'project-1',
    };
    const created = { id: 'monitor-1', name: 'API Health' };
    monitorsService.create.mockReturnValueOnce(Promise.resolve(created));

    const response = await controller.create(dto);

    expect(monitorsService.create).toHaveBeenCalledWith(dto);
    expect(response).toEqual(created);
  });

  it('findAll should delegate to monitorsService.findAll', async () => {
    const monitors = [{ id: 'monitor-1', name: 'API Health' }];
    monitorsService.findAll.mockReturnValueOnce(Promise.resolve(monitors));

    const response = await controller.findAll('project-1');

    expect(monitorsService.findAll).toHaveBeenCalledWith('project-1');
    expect(response).toEqual(monitors);
  });

  it('findOne should delegate to monitorsService.findOne', async () => {
    const monitor = { id: 'monitor-1', name: 'API Health' };
    monitorsService.findOne.mockReturnValueOnce(Promise.resolve(monitor));

    const response = await controller.findOne('project-1', 'monitor-1');

    expect(monitorsService.findOne).toHaveBeenCalledWith(
      'project-1',
      'monitor-1',
    );
    expect(response).toEqual(monitor);
  });

  it('update should delegate to monitorsService.update', async () => {
    const updated = { id: 'monitor-1', name: 'API Health Updated' };
    monitorsService.update.mockReturnValueOnce(Promise.resolve(updated));

    const response = await controller.update('project-1', 'monitor-1', {
      name: 'API Health Updated',
    });

    expect(monitorsService.update).toHaveBeenCalledWith(
      'project-1',
      'monitor-1',
      { name: 'API Health Updated' },
    );
    expect(response).toEqual(updated);
  });

  it('remove should delegate to monitorsService.remove', async () => {
    monitorsService.remove.mockReturnValueOnce(Promise.resolve(true));

    const response = await controller.remove('project-1', 'monitor-1');

    expect(monitorsService.remove).toHaveBeenCalledWith(
      'project-1',
      'monitor-1',
    );
    expect(response).toBe(true);
  });
});
