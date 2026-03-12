import { Test, TestingModule } from '@nestjs/testing';
import { IncidentsService } from './incidents.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Incident } from '@app/database';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { Repository, UpdateResult } from 'typeorm';
import { IncidentSeverity, IncidentStatus } from '@app/database';

describe('IncidentsService', () => {
  let service: IncidentsService;
  let repository: Pick<
    Repository<Incident>,
    'create' | 'save' | 'find' | 'findOne' | 'delete' | 'update'
  >;

  const incidentRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentsService,
        {
          provide: getRepositoryToken(Incident),
          useValue: incidentRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<IncidentsService>(IncidentsService);
    repository = module.get(getRepositoryToken(Incident));

    incidentRepositoryMock.create.mockReset();
    incidentRepositoryMock.save.mockReset();
    incidentRepositoryMock.find.mockReset();
    incidentRepositoryMock.findOne.mockReset();
    incidentRepositoryMock.delete.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
    const incident_id=crypto.randomUUID().toString();
    const monitor_id=crypto.randomUUID().toString();
    const user_ID=crypto.randomUUID().toString();
  it('create should map relations and save incident', async () => {
    const dto = {
      status: IncidentStatus.OPEN,
      severity: IncidentSeverity.CRITICAL,
      summary: 'Service down',
      monitorId: monitor_id,
    };

    const created = { summary: 'Service down' } as Incident;
    const saved = { id: incident_id, summary: 'Service down' } as Incident;

    incidentRepositoryMock.create.mockReturnValueOnce(created);
    incidentRepositoryMock.save.mockReturnValueOnce(Promise.resolve(saved));

    const response = await service.create(dto as any);

    expect(repository.create).toHaveBeenCalledWith({
      status: IncidentStatus.OPEN,
      severity: IncidentSeverity.CRITICAL,
      summary: 'Service down',
      resolvedAt: undefined,
      acknowledgedAt: undefined,
      startedAt: undefined,
      acknowledgedBy: { id: undefined },
      monitor: { id: monitor_id },
    });
    expect(repository.save).toHaveBeenCalledWith(created);
    expect(response).toEqual(saved);
  });

  it('findAll should fetch incidents by monitor id', async () => {
    const incidents = [{ id: incident_id}] as Incident[];
    incidentRepositoryMock.find.mockReturnValueOnce(Promise.resolve(incidents));

    const response = await service.findAll(monitor_id);

    expect(repository.find).toHaveBeenCalledWith({
      where: { monitor: { id: monitor_id } },
    });
    expect(response).toEqual(incidents);
  });

  it('findOne should fetch incident by id', async () => {
    const incident = { id: incident_id } as Incident;
    incidentRepositoryMock.findOne.mockReturnValueOnce(
      Promise.resolve(incident),
    );

    const response = await service.findOne(incident_id);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: incident_id },
      relations: {
        acknowledgedBy: true,
        metric: true,
        monitor: true,
      },
    });
    expect(response).toEqual(incident);
  });

  it('update should return current placeholder message', () => {
    const response = service.update(42, { summary: 'Updated' } as any);

    expect(response).toBe('This action updates a #42 incident');
  });

  it('remove should return true when row is deleted', async () => {
    incidentRepositoryMock.delete.mockReturnValueOnce(
      Promise.resolve({ affected: 1 }),
    );

    const response = await service.remove(incident_id);

    expect(repository.delete).toHaveBeenCalledWith({ id: incident_id });
    expect(response).toBe(true);
  });

  it('remove should return false when no rows are deleted', async () => {
    incidentRepositoryMock.delete.mockReturnValueOnce(
      Promise.resolve({ affected: 0 }),
    );

    const response = await service.remove(incident_id);

    expect(response).toBe(false);
  });
});
