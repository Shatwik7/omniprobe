import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
import {Metric, Monitor, Project} from '@app/database';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, it, expect, jest} from '@jest/globals';
import { Repository, Between } from 'typeorm';

describe('MetricsService', () => {
  let service: MetricsService;
  let metricRepository: Pick<Repository<Metric>, 'create' | 'save' | 'find' | 'findOne' | 'delete'>;
  let monitorRepository: Pick<Repository<Monitor>, 'findOne'>;

  const metricRepositoryMock = {
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
      providers: [MetricsService,
        {
          provide: getRepositoryToken(Monitor),
          useValue: monitorRepositoryMock,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Metric),
          useValue: metricRepositoryMock,
        }
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    metricRepository = module.get(getRepositoryToken(Metric));
    monitorRepository = module.get(getRepositoryToken(Monitor));

    metricRepositoryMock.create.mockReset();
    metricRepositoryMock.save.mockReset();
    metricRepositoryMock.find.mockReset();
    metricRepositoryMock.findOne.mockReset();
    metricRepositoryMock.delete.mockReset();
    monitorRepositoryMock.findOne.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('checkMonitorInProject should return false when monitor exists in project', async () => {
    monitorRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve({ id: 'monitor-1' }));

    const response = await service.checkMonitorInProject('monitor-1', 'project-1');

    expect(monitorRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'monitor-1', project: { id: 'project-1' } },
    });
    expect(response).toBe(false);
  });

  it('checkMonitorInProject should return true when monitor is missing', async () => {
    monitorRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(null));

    const response = await service.checkMonitorInProject('monitor-1', 'project-1');

    expect(response).toBe(true);
  });

  it('create should create and save a metric', async () => {
    const dto = {
      durationMs: 120,
      statusCode: 200,
      dns_response_time_ms: 5,
      tcp_connection_time_ms: 10,
      tls_handshake_time_ms: 15,
      time_to_first_byte_ms: 30,
      content_transfer_time_ms: 40,
      total_time_ms: 120,
      region: 'IN',
      isSuccess: true,
      monitorId: 'monitor-1',
    };
    const created = { durationMs: 120 } as Metric;
    const saved = { id: 'metric-1', durationMs: 120 } as Metric;

    metricRepositoryMock.create.mockReturnValueOnce(created);
    metricRepositoryMock.save.mockReturnValueOnce(Promise.resolve(saved));

    const response = await service.create(dto);

    expect(metricRepository.create).toHaveBeenCalledWith({
      durationMs: 120,
      statusCode: 200,
      dns_response_time_ms: 5,
      tcp_connection_time_ms: 10,
      tls_handshake_time_ms: 15,
      time_to_first_byte_ms: 30,
      content_transfer_time_ms: 40,
      total_time_ms: 120,
      region: 'IN',
      isSuccess: true,
      monitor: { id: 'monitor-1' },
    });
    expect(metricRepository.save).toHaveBeenCalledWith(created);
    expect(response).toEqual(saved);
  });

  it('findAll should filter by monitor and date range in descending order', async () => {
    const beginDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-01-02T00:00:00.000Z');
    metricRepositoryMock.find.mockReturnValueOnce(Promise.resolve([{ id: 'metric-1' }]));

    const response = await service.findAll('monitor-1', beginDate, endDate, 'IN');

    expect(metricRepository.find).toHaveBeenCalledWith({
      where: {
        monitor: { id: 'monitor-1' },
        createdAt: Between(beginDate, endDate),
      },
      order: { createdAt: 'DESC' },
    });
    expect(response).toEqual([{ id: 'metric-1' }]);
  });

  it('findOne should load metric with monitor relation', async () => {
    const metric = { id: 'metric-1' } as Metric;
    metricRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(metric));

    const response = await service.findOne('metric-1');

    expect(metricRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'metric-1' },
      relations: ['monitor'],
    });
    expect(response).toEqual(metric);
  });

  it('update should return null when metric does not exist', async () => {
    metricRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(null));

    const response = await service.update('metric-1', { statusCode: 500 });

    expect(response).toBeNull();
    expect(metricRepository.save).not.toHaveBeenCalled();
  });

  it('update should merge and save metric when found', async () => {
    const metric = { id: 'metric-1', statusCode: 200 } as Metric;
    const saved = { id: 'metric-1', statusCode: 500 } as Metric;
    metricRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(metric));
    metricRepositoryMock.save.mockReturnValueOnce(Promise.resolve(saved));

    const response = await service.update('metric-1', { statusCode: 500 });

    expect(metricRepository.save).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    expect(response).toEqual(saved);
  });

  it('remove should return true when delete affects rows', async () => {
    metricRepositoryMock.delete.mockReturnValueOnce(Promise.resolve({ affected: 1 }));

    const response = await service.remove('metric-1');

    expect(metricRepository.delete).toHaveBeenCalledWith('metric-1');
    expect(response).toBe(true);
  });

  it('remove should return false when delete affects no rows', async () => {
    metricRepositoryMock.delete.mockReturnValueOnce(Promise.resolve({ affected: 0 }));

    const response = await service.remove('metric-1');

    expect(response).toBe(false);
  });
});
