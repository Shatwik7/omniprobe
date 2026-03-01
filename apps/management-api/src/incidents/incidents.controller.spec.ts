import { Test, TestingModule } from '@nestjs/testing';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { IncidentSeverity, IncidentStatus } from '@app/database';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMemberGuard } from '../auth/guards/teamMember.guard';

describe('IncidentsController', () => {
  let controller: IncidentsController;
  let incidentsService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const incidentsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IncidentsController],
      providers: [
        {
          provide: IncidentsService,
          useValue: incidentsServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TeamMemberGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<IncidentsController>(IncidentsController);
    incidentsService = module.get(IncidentsService);

    incidentsServiceMock.create.mockReset();
    incidentsServiceMock.findAll.mockReset();
    incidentsServiceMock.findOne.mockReset();
    incidentsServiceMock.update.mockReset();
    incidentsServiceMock.remove.mockReset();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should delegate to incidentsService.create', async () => {
    const dto = {
      status: IncidentStatus.OPEN,
      severity: IncidentSeverity.CRITICAL,
      summary: 'Service down',
      monitorId: 'monitor-1',
      notifications: [],
    };
    incidentsService.create.mockReturnValueOnce(Promise.resolve({ id: 'incident-1' }));

    const response = await controller.create(dto as any);

    expect(incidentsService.create).toHaveBeenCalledWith(dto);
    expect(response).toEqual({ id: 'incident-1' });
  });

  it('findAll should delegate to incidentsService.findAll', async () => {
    incidentsService.findAll.mockReturnValueOnce(Promise.resolve([{ id: 'incident-1' }]));

    const response = await controller.findAll('monitor-1');

    expect(incidentsService.findAll).toHaveBeenCalledWith('monitor-1');
    expect(response).toEqual([{ id: 'incident-1' }]);
  });

  it('findOne should delegate to incidentsService.findOne', async () => {
    incidentsService.findOne.mockReturnValueOnce(Promise.resolve({ id: 'incident-1' }));

    const response = await controller.findOne('incident-1');

    expect(incidentsService.findOne).toHaveBeenCalledWith('incident-1');
    expect(response).toEqual({ id: 'incident-1' });
  });

  it('update should delegate with numeric coercion', () => {
    incidentsService.update.mockReturnValueOnce('updated');

    const response = controller.update('42', { summary: 'Updated' } as any);

    expect(incidentsService.update).toHaveBeenCalledWith(42, { summary: 'Updated' });
    expect(response).toBe('updated');
  });

  it('remove should delegate to incidentsService.remove', async () => {
    incidentsService.remove.mockReturnValueOnce(Promise.resolve(true));

    const response = await controller.remove('incident-1');

    expect(incidentsService.remove).toHaveBeenCalledWith('incident-1');
    expect(response).toBe(true);
  });
});
