import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Metric, Monitor, Project } from '@app/database';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { LongPollingService } from '@app/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMemberGuard } from '../auth/guards/teamMember.guard';

describe('Metrics Integration (controller + service + repository)', () => {
  let controller: MetricsController;
  let metricRepository: Pick<
    Repository<Metric>,
    'create' | 'save' | 'find' | 'findOne' | 'delete'
  >;
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

  const pollingServiceMock = {
    publishUpdate: jest.fn(),
    waitForUpdates: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        MetricsService,
        {
          provide: LongPollingService,
          useValue: pollingServiceMock,
        },
        {
          provide: getRepositoryToken(Metric),
          useValue: metricRepositoryMock,
        },
        {
          provide: getRepositoryToken(Monitor),
          useValue: monitorRepositoryMock,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {},
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TeamMemberGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(MetricsController);
    metricRepository = module.get(getRepositoryToken(Metric));
    monitorRepository = module.get(getRepositoryToken(Monitor));

    metricRepositoryMock.create.mockReset();
    metricRepositoryMock.save.mockReset();
    metricRepositoryMock.find.mockReset();
    metricRepositoryMock.findOne.mockReset();
    metricRepositoryMock.delete.mockReset();
    monitorRepositoryMock.findOne.mockReset();
    pollingServiceMock.publishUpdate.mockReset();
    pollingServiceMock.waitForUpdates.mockReset();
  });

  it('create should flow through publish + repository save', async () => {
    const dto = {
      durationMs: 120,
      statusCode: 200,
      dns_response_time_ms: 5,
      tcp_connection_time_ms: 10,
      tls_handshake_time_ms: 15,
      time_to_first_byte_ms: 30,
      server_processing_time_ms: 35,
      content_transfer_time_ms: 40,
      total_time_ms: 120,
      region: 'IN',
      isSuccess: true,
      monitorId: 'monitor-1',
    };

    metricRepositoryMock.create.mockReturnValueOnce({
      durationMs: 120,
    } as Metric);
    metricRepositoryMock.save.mockReturnValueOnce(
      Promise.resolve({ id: 'metric-1', durationMs: 120 } as Metric),
    );
    pollingServiceMock.publishUpdate.mockReturnValueOnce(
      Promise.resolve(undefined),
    );

    const response = await controller.create(dto);

    expect(pollingServiceMock.publishUpdate).toHaveBeenCalledWith(
      'monitor-1',
      dto,
    );
    expect(metricRepository.create).toHaveBeenCalledWith({
      durationMs: 120,
      statusCode: 200,
      dns_response_time_ms: 5,
      tcp_connection_time_ms: 10,
      tls_handshake_time_ms: 15,
      time_to_first_byte_ms: 30,
      server_processing_time_ms: 35,
      content_transfer_time_ms: 40,
      total_time_ms: 120,
      region: 'IN',
      isSuccess: true,
      monitor: { id: 'monitor-1' },
    });
    expect(response).toEqual(expect.objectContaining({ id: 'metric-1' }));
  });

  it('findAll should flow through monitor ownership check and metric query', async () => {
    monitorRepositoryMock.findOne.mockReturnValueOnce(
      Promise.resolve({ id: 'monitor-1' }),
    );
    metricRepositoryMock.find.mockReturnValueOnce(
      Promise.resolve([{ id: 'metric-1' }]),
    );

    const beginDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-01-02T00:00:00.000Z');

    const response = await controller.findAll(
      'monitor-1',
      'project-1',
      beginDate,
      endDate,
      'IN',
    );

    expect(monitorRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'monitor-1', project: { id: 'project-1' } },
    });
    expect(metricRepository.find).toHaveBeenCalled();
    expect(response).toEqual([{ id: 'metric-1' }]);
  });

  it('poll should flow through monitor check then long polling wait', async () => {
    const payload = { id: 'metric-1', statusCode: 200 };
    monitorRepositoryMock.findOne.mockReturnValueOnce(
      Promise.resolve({ id: 'monitor-1' }),
    );
    pollingServiceMock.waitForUpdates.mockReturnValueOnce(
      Promise.resolve(payload),
    );

    const response = await controller.poll('monitor-1', 'project-1');

    expect(pollingServiceMock.waitForUpdates).toHaveBeenCalledWith('monitor-1');
    expect(response).toEqual(payload);
  });

  it('update and remove should flow to repository save/delete', async () => {
    metricRepositoryMock.findOne.mockReturnValueOnce(
      Promise.resolve({ id: 'metric-1', statusCode: 200 } as Metric),
    );
    metricRepositoryMock.save.mockReturnValueOnce(
      Promise.resolve({ id: 'metric-1', statusCode: 500 } as Metric),
    );
    metricRepositoryMock.delete.mockReturnValueOnce(
      Promise.resolve({ affected: 1 }),
    );

    const updated = await controller.update('metric-1', { statusCode: 500 });
    const removed = await controller.remove('metric-1');

    expect(updated).toEqual(expect.objectContaining({ statusCode: 500 }));
    expect(metricRepository.delete).toHaveBeenCalledWith('metric-1');
    expect(removed).toBe(true);
  });
});
