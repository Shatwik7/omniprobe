import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsRepository } from './analytics.repository';
import { Repository } from 'typeorm';
import { Analytics, Monitor, Metric, AlertPolicy } from '@app/database';
import { BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import Redis from 'ioredis';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, beforeEach, afterEach, it, expect, jest} from '@jest/globals';

describe('AnalyticsRepository', () => {
  let repository: AnalyticsRepository;
  let analyticsRepo: jest.Mocked<Repository<Analytics>>;
  let monitorRepo: jest.Mocked<Repository<Monitor>>;
  let metricRepo: jest.Mocked<Repository<Metric>>;
  let alertPolicyRepo: jest.Mocked<Repository<AlertPolicy>>;
  let redisClient: jest.Mocked<Redis>;

  const mockMonitorId = '550e8400-e29b-41d4-a716-446655440000';
  const mockAnalyticsId = '550e8400-e29b-41d4-a716-446655440001';
  const mockMetricId = '550e8400-e29b-41d4-a716-446655440002';
  const mockPolicyId = '550e8400-e29b-41d4-a716-446655440003';
  const mockRegion = 'IN';

  beforeEach(async () => {
    // Mock repositories
    analyticsRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    } as any;

    monitorRepo = {
      findOne: jest.fn(),
    } as any;

    metricRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    } as any;

    alertPolicyRepo = {
      findOne: jest.fn(),
    } as any;

    // Mock Redis
    redisClient = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      ping: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsRepository,
        {
          provide: getRepositoryToken(Analytics),
          useValue: analyticsRepo,
        },
        {
          provide: getRepositoryToken(Monitor),
          useValue: monitorRepo,
        },
        {
          provide: getRepositoryToken(Metric),
          useValue: metricRepo,
        },
        {
          provide: getRepositoryToken(AlertPolicy),
          useValue: alertPolicyRepo,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: redisClient,
        },
      ],
    }).compile();

    repository = module.get<AnalyticsRepository>(AnalyticsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrUpdateAnalytics', () => {
    it('should throw BadRequestException if monitor ID is missing', async () => {
      const analyticsData: Partial<Analytics> = {
        region: mockRegion,
        rollingAverage: 100,
      } as any;

      await expect(
        repository.createOrUpdateAnalytics(analyticsData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if region is missing', async () => {
      const analyticsData: Partial<Analytics> = {
        monitor: { id: mockMonitorId } as any,
        rollingAverage: 100,
      } as any;

      await expect(
        repository.createOrUpdateAnalytics(analyticsData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create new analytics if not exists', async () => {
      const analyticsData: Partial<Analytics> = {
        monitor: { id: mockMonitorId } as any,
        region: mockRegion,
        rollingAverage: 100,
        recentMetrics: [],
      } as any;

      const mockCreatedAnalytics: Analytics = {
        id: mockAnalyticsId,
        ...analyticsData,
      } as any;

      analyticsRepo.findOne.mockResolvedValue(null);
      analyticsRepo.create.mockReturnValue(mockCreatedAnalytics as any);
      analyticsRepo.save.mockResolvedValue(mockCreatedAnalytics);
      redisClient.del.mockResolvedValue(0 as any);

      const result = await repository.createOrUpdateAnalytics(analyticsData);

      expect(result.id).toBe(mockAnalyticsId);
      expect(analyticsRepo.findOne).toHaveBeenCalledWith({
        where: {
          monitor: { id: mockMonitorId },
          region: mockRegion,
        },
      });
      expect(analyticsRepo.save).toHaveBeenCalled();
      expect(redisClient.del).toHaveBeenCalled();
    });

    it('should update existing analytics', async () => {
      const existingAnalytics: Analytics = {
        id: mockAnalyticsId,
        monitor: { id: mockMonitorId } as any,
        region: mockRegion,
        recentMetrics: [],
      } as any;

      const analyticsData: Partial<Analytics> = {
        monitor: { id: mockMonitorId } as any,
        region: mockRegion,
        rollingAverage: 150,
        recentMetrics: [],
      } as any;

      analyticsRepo.findOne.mockResolvedValue(existingAnalytics);
      analyticsRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await repository.createOrUpdateAnalytics(analyticsData);

      expect(analyticsRepo.update).toHaveBeenCalledWith(
        mockAnalyticsId,
        expect.any(Object),
      );
      expect(redisClient.del).toHaveBeenCalled();
    });

    it('should rotate metrics when capacity is exceeded', async () => {
      const oldMetrics = Array.from({ length: 20 }, (_, i) => ({
        id: `metric-${i}`,
      })) as any;

      const existingAnalytics: Analytics = {
        id: mockAnalyticsId,
        monitor: { id: mockMonitorId } as any,
        region: mockRegion,
        recentMetrics: oldMetrics,
      } as any;

      const newMetric = { id: 'new-metric' } as any;
      const analyticsData: Partial<Analytics> = {
        monitor: { id: mockMonitorId } as any,
        region: mockRegion,
        recentMetrics: [newMetric],
      } as any;

      analyticsRepo.findOne.mockResolvedValue(existingAnalytics);
      analyticsRepo.update.mockResolvedValue({ affected: 1 } as any);
      redisClient.del.mockResolvedValue(0 as any);

      await repository.createOrUpdateAnalytics(analyticsData);

      // Verify that update was called and metrics were rotated
      const updateCall = analyticsRepo.update.mock.calls[0];
      const updatedData = updateCall[1] as any;
      
      // Should have 20 metrics (keeping only last 20)
      expect(updatedData.recentMetrics.length).toBe(20);
      // First metric should be the second one (first was removed)
      expect(updatedData.recentMetrics[0].id).toBe('metric-1');
      // Last metric should be the new one
      expect(updatedData.recentMetrics[19].id).toBe('new-metric');
    });
  });

  describe('getAnalyticsByMonitorAndRegion', () => {
    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(
        repository.getAnalyticsByMonitorAndRegion('invalid-uuid', mockRegion),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if region is missing', async () => {
      await expect(
        repository.getAnalyticsByMonitorAndRegion(mockMonitorId, ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return cached analytics if available', async () => {
      const mockAnalytics: Analytics = {
        id: mockAnalyticsId,
        monitor: { id: mockMonitorId } as any,
        region: mockRegion,
      } as any;

      redisClient.get.mockResolvedValue(JSON.stringify(mockAnalytics));

      const result = await repository.getAnalyticsByMonitorAndRegion(
        mockMonitorId,
        mockRegion,
      );

      expect(result).toEqual(mockAnalytics);
      expect(redisClient.get).toHaveBeenCalledWith(
        `analytics:${mockMonitorId}:${mockRegion}`,
      );
      expect(analyticsRepo.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from database if not in cache', async () => {
      const mockAnalytics: Analytics = {
        id: mockAnalyticsId,
        monitor: { id: mockMonitorId } as any,
        region: mockRegion,
      } as any;

      redisClient.get.mockResolvedValue(null);
      analyticsRepo.findOne.mockResolvedValue(mockAnalytics);
      redisClient.setex.mockResolvedValue('OK');

      const result = await repository.getAnalyticsByMonitorAndRegion(
        mockMonitorId,
        mockRegion,
      );

      expect(result).toEqual(mockAnalytics);
      expect(analyticsRepo.findOne).toHaveBeenCalled();
      expect(redisClient.setex).toHaveBeenCalled();
    });

    it('should return null if analytics not found', async () => {
      redisClient.get.mockResolvedValue(null);
      analyticsRepo.findOne.mockResolvedValue(null);

      const result = await repository.getAnalyticsByMonitorAndRegion(
        mockMonitorId,
        mockRegion,
      );

      expect(result).toBeNull();
      expect(redisClient.setex).not.toHaveBeenCalled();
    });
  });

  describe('getAnalyticsByMonitorId', () => {
    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(
        repository.getAnalyticsByMonitorId('invalid-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return cached analytics if available', async () => {
      const mockAnalytics: Analytics[] = [
        { id: mockAnalyticsId, region: 'us-east-1' } as any,
        { id: 'id2', region: 'us-west-1' } as any,
      ];

      redisClient.get.mockResolvedValue(JSON.stringify(mockAnalytics));

      const result = await repository.getAnalyticsByMonitorId(mockMonitorId);

      expect(result).toEqual(mockAnalytics);
      expect(redisClient.get).toHaveBeenCalledWith(
        `monitor_analytics:${mockMonitorId}`,
      );
    });

    it('should fetch all regional analytics from database', async () => {
      const mockAnalytics: Analytics[] = [
        { id: mockAnalyticsId, region: 'us-east-1' } as any,
      ];

      redisClient.get.mockResolvedValue(null);
      analyticsRepo.find.mockResolvedValue(mockAnalytics);
      redisClient.setex.mockResolvedValue('OK');

      const result = await repository.getAnalyticsByMonitorId(mockMonitorId);

      expect(result).toEqual(mockAnalytics);
      expect(analyticsRepo.find).toHaveBeenCalledWith({
        where: { monitor: { id: mockMonitorId } },
        relations: ['monitor'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getAnalyticsById', () => {
    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(
        repository.getAnalyticsById('invalid-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if not found', async () => {
      analyticsRepo.findOne.mockResolvedValue(null);

      await expect(
        repository.getAnalyticsById(mockAnalyticsId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return analytics by ID', async () => {
      const mockAnalytics: Analytics = {
        id: mockAnalyticsId,
      } as any;

      analyticsRepo.findOne.mockResolvedValue(mockAnalytics);

      const result = await repository.getAnalyticsById(mockAnalyticsId);

      expect(result).toEqual(mockAnalytics);
      expect(analyticsRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockAnalyticsId },
        relations: ['monitor'],
      });
    });
  });

  describe('findMonitorById', () => {
    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(
        repository.findMonitorById('invalid-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if monitor not found', async () => {
      monitorRepo.findOne.mockResolvedValue(null);

      await expect(
        repository.findMonitorById(mockMonitorId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return monitor with relations', async () => {
      const mockMonitor: Monitor = {
        id: mockMonitorId,
        name: 'Test Monitor',
      } as any;

      monitorRepo.findOne.mockResolvedValue(mockMonitor);

      const result = await repository.findMonitorById(mockMonitorId);

      expect(result).toEqual(mockMonitor);
      expect(monitorRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockMonitorId },
        relations: ['project', 'alertPolicy'],
      });
    });
  });

  describe('findMetricById', () => {
    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(
        repository.findMetricById('invalid-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if metric not found', async () => {
      metricRepo.findOne.mockResolvedValue(null);

      await expect(
        repository.findMetricById(mockMetricId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return metric by ID', async () => {
      const mockMetric: Metric = {
        id: mockMetricId,
        durationMs: 100,
      } as any;

      metricRepo.findOne.mockResolvedValue(mockMetric);

      const result = await repository.findMetricById(mockMetricId);

      expect(result).toEqual(mockMetric);
    });
  });

  describe('findAlertPolicyById', () => {
    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(
        repository.findAlertPolicyById('invalid-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if policy not found', async () => {
      alertPolicyRepo.findOne.mockResolvedValue(null);

      await expect(
        repository.findAlertPolicyById(mockPolicyId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return alert policy by ID', async () => {
      const mockPolicy: AlertPolicy = {
        id: mockPolicyId,
        name: 'Test Policy',
      } as any;

      alertPolicyRepo.findOne.mockResolvedValue(mockPolicy);

      const result = await repository.findAlertPolicyById(mockPolicyId);

      expect(result).toEqual(mockPolicy);
    });
  });

  describe('getRecentMetricsForMonitor', () => {
    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(
        repository.getRecentMetricsForMonitor('invalid-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid limit', async () => {
      await expect(
        repository.getRecentMetricsForMonitor(mockMonitorId, 0),
      ).rejects.toThrow(BadRequestException);

      await expect(
        repository.getRecentMetricsForMonitor(mockMonitorId, 1001),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return recent metrics', async () => {
      const mockMetrics: Metric[] = [
        { id: 'metric1' } as any,
        { id: 'metric2' } as any,
      ];

      metricRepo.find.mockResolvedValue(mockMetrics);

      const result = await repository.getRecentMetricsForMonitor(
        mockMonitorId,
        20,
      );

      expect(result).toEqual(mockMetrics);
      expect(metricRepo.find).toHaveBeenCalledWith({
        where: { monitor: { id: mockMonitorId } },
        order: { createdAt: 'DESC' },
        take: 20,
      });
    });
  });

  describe('deleteAnalytics', () => {
    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(
        repository.deleteAnalytics('invalid-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delete analytics and clear cache', async () => {
      analyticsRepo.delete.mockResolvedValue({ affected: 1 } as any);
      redisClient.keys.mockResolvedValue(['key1', 'key2']);
      redisClient.del.mockResolvedValue(2 as any);

      const result = await repository.deleteAnalytics(mockAnalyticsId);

      expect(result).toBe(true);
      expect(analyticsRepo.delete).toHaveBeenCalledWith({ id: mockAnalyticsId });
      expect(redisClient.keys).toHaveBeenCalled();
    });

    it('should return false if analytics not deleted', async () => {
      analyticsRepo.delete.mockResolvedValue({ affected: 0 } as any);

      const result = await repository.deleteAnalytics(mockAnalyticsId);

      expect(result).toBe(false);
    });
  });

  describe('getAnalyticsCountByMonitor', () => {
    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(
        repository.getAnalyticsCountByMonitor('invalid-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return analytics count', async () => {
      analyticsRepo.count.mockResolvedValue(5);

      const result = await repository.getAnalyticsCountByMonitor(mockMonitorId);

      expect(result).toBe(5);
      expect(analyticsRepo.count).toHaveBeenCalledWith({
        where: { monitor: { id: mockMonitorId } },
      });
    });
  });

  describe('clearAllCache', () => {
    it('should clear all analytics cache', async () => {
      redisClient.keys.mockResolvedValueOnce(['key1', 'key2']);
      redisClient.keys.mockResolvedValueOnce(['key3']);
      redisClient.del.mockResolvedValue(3 as any);

      await repository.clearAllCache();

      expect(redisClient.keys).toHaveBeenCalledTimes(2);
      expect(redisClient.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status', async () => {
      analyticsRepo.find.mockResolvedValue([]);
      redisClient.ping.mockResolvedValue('PONG');

      const result = await repository.getHealthStatus();

      expect(result).toEqual({ db: true, cache: true });
    });

    it('should return unhealthy status if DB fails', async () => {
      analyticsRepo.find.mockRejectedValue(new Error('DB Error'));
      redisClient.ping.mockResolvedValue('PONG');

      const result = await repository.getHealthStatus();

      expect(result).toEqual({ db: false, cache: true });
    });

    it('should return unhealthy status if Redis fails', async () => {
      analyticsRepo.find.mockResolvedValue([]);
      redisClient.ping.mockRejectedValue(new Error('Redis Error'));

      const result = await repository.getHealthStatus();

      expect(result).toEqual({ db: true, cache: false });
    });
  });
});
