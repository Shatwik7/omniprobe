import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { LongPollingService } from '@app/common';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: jest.Mocked<AnalyticsService>;
  let longPollingService: {
    publishUpdate: jest.Mock;
  };

  const MONITOR_ID = '550e8400-e29b-41d4-a716-446655440000';
  const METRIC_ID = '550e8400-e29b-41d4-a716-446655440001';
  const REGION_ID = '550e8400-e29b-41d4-a716-446655440002';

  beforeEach(async () => {
    const mockAnalyticsService = {
      processMetricAndUpdateAnalytics: jest.fn(),
      getAlertPolicy: jest.fn(),
      getMonitor: jest.fn(),
      getMetric: jest.fn(),
    };

    const mockLongPollingService = {
      publishUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
        {
          provide: LongPollingService,
          useValue: mockLongPollingService,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get(AnalyticsService) as jest.Mocked<AnalyticsService>;
    longPollingService = module.get(LongPollingService);

    service.processMetricAndUpdateAnalytics.mockReset();
    service.getAlertPolicy.mockReset();
    service.getMonitor.mockReset();
    service.getMetric.mockReset();
    longPollingService.publishUpdate.mockReset();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should process valid analytics payload object and publish long-poll update', async () => {
    const payload = {
      MonitorId: MONITOR_ID,
      MetricId: METRIC_ID,
      Region: REGION_ID,
    };

    const alertPolicy = {
      rules: {
        rules: [{ metric: 'sla_latency', threshold: 2500 }],
      },
    } as any;
    const monitor = { id: MONITOR_ID } as any;
    const metric = { id: METRIC_ID } as any;
    const analytics = { id: 'analytics-1', monitor, region: REGION_ID } as any;

    service.getAlertPolicy.mockReturnValueOnce(Promise.resolve(alertPolicy));
    service.getMonitor.mockReturnValueOnce(Promise.resolve(monitor));
    service.getMetric.mockReturnValueOnce(Promise.resolve(metric));
    service.processMetricAndUpdateAnalytics.mockReturnValueOnce(
      Promise.resolve(analytics),
    );
    longPollingService.publishUpdate.mockReturnValueOnce(
      Promise.resolve(undefined),
    );

    const result = await controller.create(payload);

    expect(service.getAlertPolicy).toHaveBeenCalledWith(MONITOR_ID);
    expect(service.getMonitor).toHaveBeenCalledWith(MONITOR_ID);
    expect(service.getMetric).toHaveBeenCalledWith(METRIC_ID);
    expect(service.processMetricAndUpdateAnalytics).toHaveBeenCalledWith(
      metric,
      MONITOR_ID,
      REGION_ID,
      2500,
      10,
    );
    expect(longPollingService.publishUpdate).toHaveBeenCalledWith(
      `analytics:${MONITOR_ID}`,
      analytics,
    );
    expect(result).toBeNull();
  });

  it('should process valid analytics payload JSON string', async () => {
    const payload = JSON.stringify({
      MonitorId: MONITOR_ID,
      MetricId: METRIC_ID,
      Region: REGION_ID,
    });

    service.getAlertPolicy.mockReturnValueOnce(
      Promise.resolve({ rules: { rules: [{ metric: 'sla_latency', threshold: 1800 }] } } as any),
    );
    service.getMonitor.mockReturnValueOnce(Promise.resolve({ id: MONITOR_ID } as any));
    service.getMetric.mockReturnValueOnce(Promise.resolve({ id: METRIC_ID } as any));
    service.processMetricAndUpdateAnalytics.mockReturnValueOnce(
      Promise.resolve({ id: 'analytics-2' } as any),
    );
    longPollingService.publishUpdate.mockReturnValueOnce(
      Promise.resolve(undefined),
    );

    const result = await controller.create(payload);

    expect(service.getMonitor).toHaveBeenCalledTimes(1);
    expect(service.processMetricAndUpdateAnalytics).toHaveBeenCalledTimes(1);
    expect(longPollingService.publishUpdate).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });

  it('should ignore invalid JSON payload', async () => {
    const result = await controller.create('{bad-json');

    expect(service.getAlertPolicy).not.toHaveBeenCalled();
    expect(service.getMonitor).not.toHaveBeenCalled();
    expect(service.getMetric).not.toHaveBeenCalled();
    expect(service.processMetricAndUpdateAnalytics).not.toHaveBeenCalled();
    expect(longPollingService.publishUpdate).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('should ignore payload that fails DTO validation', async () => {
    const invalidPayload = {
      MonitorId: MONITOR_ID,
      Region: REGION_ID,
      // MetricId missing intentionally
    };

    const result = await controller.create(invalidPayload);

    expect(service.getAlertPolicy).not.toHaveBeenCalled();
    expect(service.getMonitor).not.toHaveBeenCalled();
    expect(service.getMetric).not.toHaveBeenCalled();
    expect(service.processMetricAndUpdateAnalytics).not.toHaveBeenCalled();
    expect(longPollingService.publishUpdate).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
