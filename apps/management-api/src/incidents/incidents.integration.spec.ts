import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incident, IncidentSeverity, IncidentStatus } from '@app/database';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMemberGuard } from '../auth/guards/teamMember.guard';

describe('Incidents Integration (controller + service + repository)', () => {
  let controller: IncidentsController;
  let repository: Pick<Repository<Incident>, 'create' | 'save' | 'find' | 'findOne' | 'delete'>;

  const incidentRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IncidentsController],
      providers: [
        IncidentsService,
        {
          provide: getRepositoryToken(Incident),
          useValue: incidentRepositoryMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TeamMemberGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(IncidentsController);
    repository = module.get(getRepositoryToken(Incident));

    incidentRepositoryMock.create.mockReset();
    incidentRepositoryMock.save.mockReset();
    incidentRepositoryMock.find.mockReset();
    incidentRepositoryMock.findOne.mockReset();
    incidentRepositoryMock.delete.mockReset();
  });

  it('create should flow to repository.create/save', async () => {
    const dto = {
      status: IncidentStatus.OPEN,
      severity: IncidentSeverity.CRITICAL,
      summary: 'Service down',
      monitorId: 'monitor-1',
      notifications: [],
    };

    incidentRepositoryMock.create.mockReturnValueOnce({ summary: 'Service down' } as Incident);
    incidentRepositoryMock.save.mockReturnValueOnce(Promise.resolve({ id: 'incident-1' } as Incident));

    const response = await controller.create(dto as any);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: IncidentStatus.OPEN,
        severity: IncidentSeverity.CRITICAL,
        summary: 'Service down',
        monitor: { id: 'monitor-1' },
      }),
    );
    expect(response).toEqual(expect.objectContaining({ id: 'incident-1' }));
  });

  it('findAll should flow to repository.find by monitor', async () => {
    incidentRepositoryMock.find.mockReturnValueOnce(Promise.resolve([{ id: 'incident-1' }]));

    const response = await controller.findAll('monitor-1');

    expect(repository.find).toHaveBeenCalledWith({ where: { monitor: { id: 'monitor-1' } } });
    expect(response).toEqual([{ id: 'incident-1' }]);
  });

  it('findOne should flow to repository.findOne', async () => {
    incidentRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve({ id: 'incident-1' }));

    const response = await controller.findOne('incident-1');

    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'incident-1' }, relations: { acknowledgedBy: true, metric: true, monitor: true, notifications: true } });
    expect(response).toEqual({ id: 'incident-1' });
  });

  it('update and remove should flow with placeholder update and repository delete', async () => {
    incidentRepositoryMock.delete.mockReturnValueOnce(Promise.resolve({ affected: 1 }));

    const updateResponse = await controller.update('42', { summary: 'Updated' } as any);
    const removeResponse = await controller.remove('incident-1');

    expect(updateResponse).toBe('This action updates a #42 incident');
    expect(repository.delete).toHaveBeenCalledWith({ id: 'incident-1' });
    expect(removeResponse).toBe(true);
  });
});
