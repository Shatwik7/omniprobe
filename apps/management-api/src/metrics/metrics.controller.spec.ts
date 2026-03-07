import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { LongPollingService } from '@app/common';
import { NotAcceptableException, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMemberGuard } from '../auth/guards/teamMember.guard';

describe('MetricsController', () => {
  let controller: MetricsController;
  let metricsService: {
    checkMonitorInProject: jest.Mock;
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let pollingService: {
    publishUpdate: jest.Mock;
    waitForUpdates: jest.Mock;
  };

  const metricsServiceMock = {
    checkMonitorInProject: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const pollingServiceMock = {
    publishUpdate: jest.fn(),
    waitForUpdates: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: LongPollingService,
          useValue: pollingServiceMock,
        },
        {
          provide: MetricsService,
          useValue: metricsServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TeamMemberGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MetricsController>(MetricsController);
    metricsService = module.get(MetricsService);
    pollingService = module.get(LongPollingService);

    metricsServiceMock.checkMonitorInProject.mockReset();
    metricsServiceMock.create.mockReset();
    metricsServiceMock.findAll.mockReset();
    metricsServiceMock.findOne.mockReset();
    metricsServiceMock.update.mockReset();
    metricsServiceMock.remove.mockReset();
    pollingServiceMock.publishUpdate.mockReset();
    pollingServiceMock.waitForUpdates.mockReset();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should publish update and create metric', async () => {
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
    metricsService.create.mockReturnValueOnce(
      Promise.resolve({ id: 'metric-1' }),
    );
    pollingService.publishUpdate.mockReturnValueOnce(
      Promise.resolve(undefined),
    );

    const response = await controller.create(dto);

    expect(pollingService.publishUpdate).toHaveBeenCalledWith('monitor-1', dto);
    expect(metricsService.create).toHaveBeenCalledWith(dto);
    expect(response).toEqual({ id: 'metric-1' });
  });

  it('findAll should throw when monitor does not belong to project', async () => {
    metricsService.checkMonitorInProject.mockReturnValueOnce(
      Promise.resolve(true),
    );

    await expect(
      controller.findAll(
        'monitor-1',
        'project-1',
        new Date(),
        new Date(),
        'IN',
      ),
    ).rejects.toThrow(NotAcceptableException);
  });

  it('findAll should delegate when monitor belongs to project', async () => {
    const beginDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-01-02T00:00:00.000Z');
    metricsService.checkMonitorInProject.mockReturnValueOnce(
      Promise.resolve(false),
    );
    metricsService.findAll.mockReturnValueOnce(
      Promise.resolve([{ id: 'metric-1' }]),
    );

    const response = await controller.findAll(
      'monitor-1',
      'project-1',
      beginDate,
      endDate,
      'IN',
    );

    expect(metricsService.findAll).toHaveBeenCalledWith(
      'monitor-1',
      beginDate,
      endDate,
      'IN',
    );
    expect(response).toEqual([{ id: 'metric-1' }]);
  });

  it('poll should throw not found when waitForUpdates returns null', async () => {
    metricsService.checkMonitorInProject.mockReturnValueOnce(
      Promise.resolve(false),
    );
    pollingService.waitForUpdates.mockReturnValueOnce(Promise.resolve(null));

    await expect(controller.poll('monitor-1', 'project-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('poll should return data when updates are available', async () => {
    const payload = { id: 'metric-1' };
    metricsService.checkMonitorInProject.mockReturnValueOnce(
      Promise.resolve(false),
    );
    pollingService.waitForUpdates.mockReturnValueOnce(Promise.resolve(payload));

    const response = await controller.poll('monitor-1', 'project-1');

    expect(response).toEqual(payload);
  });

  it('findOne/update/remove should delegate to service', async () => {
    metricsService.findOne.mockReturnValueOnce(
      Promise.resolve({ id: 'metric-1' }),
    );
    metricsService.update.mockReturnValueOnce(
      Promise.resolve({ id: 'metric-1', statusCode: 500 }),
    );
    metricsService.remove.mockReturnValueOnce(Promise.resolve(true));

    const found = await controller.findOne('metric-1');
    const updated = await controller.update('metric-1', { statusCode: 500 });
    const removed = await controller.remove('metric-1');

    expect(found).toEqual({ id: 'metric-1' });
    expect(updated).toEqual({ id: 'metric-1', statusCode: 500 });
    expect(removed).toBe(true);
  });
});
