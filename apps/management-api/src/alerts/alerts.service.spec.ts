import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from './alerts.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Alert, AlertType, Monitor } from '@app/database';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { Repository } from 'typeorm';

describe('AlertsService', () => {
  let service: AlertsService;
  let alertRepository: Pick<
    Repository<Alert>,
    'create' | 'save' | 'find' | 'findOne' | 'delete'
  >;
  let monitorRepository: Pick<Repository<Monitor>, 'findOne'>;

  const alertRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const monitorRepositoryMock = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: getRepositoryToken(Alert),
          useValue: alertRepositoryMock,
        },
        {
          provide: getRepositoryToken(Monitor),
          useValue: monitorRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    alertRepository = module.get(getRepositoryToken(Alert));
    monitorRepository = module.get(getRepositoryToken(Monitor));

    alertRepositoryMock.create.mockReset();
    alertRepositoryMock.save.mockReset();
    alertRepositoryMock.find.mockReset();
    alertRepositoryMock.findOne.mockReset();
    alertRepositoryMock.delete.mockReset();
    monitorRepositoryMock.findOne.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('checkMonitorInProject should return false when monitor exists', async () => {
    monitorRepositoryMock.findOne.mockReturnValueOnce(
      Promise.resolve({ id: 'monitor-1' }),
    );

    const result = await service.checkMonitorInProject('monitor-1', 'project-1');

    expect(monitorRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'monitor-1', project: { id: 'project-1' } },
    });
    expect(result).toBe(false);
  });

  it('checkMonitorInProject should return true when monitor is missing', async () => {
    monitorRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(null));

    const result = await service.checkMonitorInProject('monitor-1', 'project-1');

    expect(result).toBe(true);
  });

  it('create should create and save alert', async () => {
    const dto = {
      type: AlertType.ANOMALY,
      message: 'Latency anomaly detected',
      monitorId: 'monitor-1',
      metricId: 'metric-1',
      metadata: { score: 3.2 },
    };
    const created = { message: dto.message } as Alert;
    const saved = { id: 'alert-1', message: dto.message } as Alert;

    alertRepositoryMock.create.mockReturnValueOnce(created);
    alertRepositoryMock.save.mockReturnValueOnce(Promise.resolve(saved));

    const result = await service.create(dto);

    expect(alertRepository.create).toHaveBeenCalledWith({
      type: AlertType.ANOMALY,
      message: 'Latency anomaly detected',
      metadata: { score: 3.2 },
      monitor: { id: 'monitor-1' },
      metric: { id: 'metric-1' },
    });
    expect(alertRepository.save).toHaveBeenCalledWith(created);
    expect(result).toEqual(saved);
  });

  it('findAll should return alerts for monitor ordered by createdAt desc', async () => {
    const list = [{ id: 'alert-1' }, { id: 'alert-2' }] as Alert[];
    alertRepositoryMock.find.mockReturnValueOnce(Promise.resolve(list));

    const result = await service.findAll('monitor-1');

    expect(alertRepository.find).toHaveBeenCalledWith({
      where: { monitor: { id: 'monitor-1' } },
      relations: ['monitor', 'metric'],
      order: { createdAt: 'DESC' },
    });
    expect(result).toEqual(list);
  });

  it('findOne should return alert with relations', async () => {
    const alert = { id: 'alert-1' } as Alert;
    alertRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(alert));

    const result = await service.findOne('alert-1');

    expect(alertRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'alert-1' },
      relations: ['monitor', 'metric'],
    });
    expect(result).toEqual(alert);
  });

  it('update should save updated alert when found', async () => {
    const existing = {
      id: 'alert-1',
      type: AlertType.ANOMALY,
      message: 'old',
    } as Alert;
    const updated = { ...existing, message: 'new' } as Alert;

    alertRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(existing));
    alertRepositoryMock.save.mockReturnValueOnce(Promise.resolve(updated));

    const result = await service.update('alert-1', { message: 'new' });

    expect(alertRepository.save).toHaveBeenCalled();
    expect(result).toEqual(updated);
  });

  it('update should return null when alert does not exist', async () => {
    alertRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(null));

    const result = await service.update('missing', { message: 'new' });

    expect(result).toBeNull();
    expect(alertRepositoryMock.save).not.toHaveBeenCalled();
  });

  it('remove should return true when delete affected rows', async () => {
    alertRepositoryMock.delete.mockReturnValueOnce(Promise.resolve({ affected: 1 }));

    const result = await service.remove('alert-1');

    expect(alertRepository.delete).toHaveBeenCalledWith('alert-1');
    expect(result).toBe(true);
  });

  it('remove should return false when delete affected zero rows', async () => {
    alertRepositoryMock.delete.mockReturnValueOnce(Promise.resolve({ affected: 0 }));

    const result = await service.remove('alert-1');

    expect(result).toBe(false);
  });
});
