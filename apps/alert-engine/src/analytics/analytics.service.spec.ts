import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRepository } from './analytics.repository';
import { Metric, Monitor, Analytics } from '@app/database';
import { describe, beforeEach, it, expect, jest} from '@jest/globals';

enum MetricTrend {
  INCREASING = 'increasing',
  RAPID_INCREASE = 'rapid_increase',
  DECREASING = 'decreasing',
  STAGNANT = 'stagnant',
  RANDOM = 'random',
  SPIKE = 'spike',
  SEASONAL = 'seasonal',
}

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let repository: jest.Mocked<AnalyticsRepository>;

  const mockMonitorId = '550e8400-e29b-41d4-a716-446655440000';
  const mockAnalyticsId = '550e8400-e29b-41d4-a716-446655440001';
  const mockRegion = 'us-east-1';

  beforeEach(async () => {
    const mockRepository = {
      createOrUpdateAnalytics: jest.fn(),
      getAnalyticsByMonitorAndRegion: jest.fn(),
      getAnalyticsByMonitorId: jest.fn(),
      getAnalyticsById: jest.fn(),
      findMonitorById: jest.fn(),
      findMetricById: jest.fn(),
      findAlertPolicyById: jest.fn(),
      getRecentMetricsForMonitor: jest.fn(),
      deleteAnalytics: jest.fn(),
      getAnalyticsCountByMonitor: jest.fn(),
      clearAllCache: jest.fn(),
      getHealthStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: AnalyticsRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    repository = module.get(AnalyticsRepository) as jest.Mocked<AnalyticsRepository>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  function generateMetricsSeries(
    count: number,
    baseTime: number,
    factor: number,
    trend: MetricTrend,
  ): Metric[] {
    const metrics: Metric[] = [];
    const monitorId = crypto.randomUUID().toString();

    for (let i = 0; i < count; i++) {
      let delta = 0;

      switch (trend) {
        case MetricTrend.INCREASING:
          delta = i * factor;
          break;
        case MetricTrend.RAPID_INCREASE:
          delta = Math.pow(i, 2) * factor;
          break;
        case MetricTrend.DECREASING:
          delta = -i * factor;
          break;
        case MetricTrend.STAGNANT:
          delta = 0;
          break;
        case MetricTrend.RANDOM:
          delta = Math.random() * factor * 10 - factor * 5;
          break;
        case MetricTrend.SPIKE:
          delta = i === Math.floor(count / 2) ? factor * 50 : i * factor;
          break;
        case MetricTrend.SEASONAL:
          delta = Math.sin(i / 3) * factor * 10;
          break;
      }

      const duration = baseTime + delta;

      const metric: Metric = {
        id: i.toString(),
        monitor: { id: monitorId } as Monitor,
        region: 'IN',
        breakdown: {
          dns: 20 + i,
          tcp: 30 + i,
          tls: 10 + i,
          ttfb: 50 + i,
          spt: 0,
          ctt: 0,
        },
        responseBody: 'OK',
        isSuccess: true,
        statusCode: 200,
        durationMs: duration,
        total_time_ms: duration,
        dns_response_time_ms: 20 + i,
        tcp_connection_time_ms: 30 + i,
        tls_handshake_time_ms: 10 + i,
        time_to_first_byte_ms: 50 + i,
        server_processing_time_ms: 50 + i,
        content_transfer_time_ms: 20 + i,
        createdAt: new Date(),
      };

      metrics.push(metric);
    }

    return metrics;
  }

  function generateTTFBDegradation(
    count: number,
    baseLatency: number,
    factor: number,
  ): Metric[] {
    const metrics: Metric[] = [];
    const monitorId = crypto.randomUUID().toString();

    for (let i = 0; i < count; i++) {
      const ttfb = 50 + i * factor;
      const total = baseLatency + ttfb;

      metrics.push({
        id: i.toString(),
        monitor: { id: monitorId } as Monitor,
        region: 'IN',
        breakdown: {
          dns: 20,
          tcp: 30,
          tls: 10,
          ttfb,
          spt: 0,
          ctt: 0,
        },
        responseBody: 'OK',
        isSuccess: true,
        statusCode: 200,
        durationMs: total,
        total_time_ms: total,
        dns_response_time_ms: 20,
        tcp_connection_time_ms: 30,
        tls_handshake_time_ms: 10,
        time_to_first_byte_ms: ttfb,
        server_processing_time_ms: 50,
        content_transfer_time_ms: 20,
        createdAt: new Date(),
      });
    }

    return metrics;
  }

  function generateErrorBurst(
    count: number,
    burstStart: number,
    burstLength: number,
  ): Metric[] {
    const metrics: Metric[] = [];
    const monitorId = crypto.randomUUID().toString();

    for (let i = 0; i < count; i++) {
      const isError = i >= burstStart && i < burstStart + burstLength;

      metrics.push({
        id: i.toString(),
        monitor: { id: monitorId } as Monitor,
        region: 'IN',
        breakdown: {
          dns: 20,
          tcp: 30,
          tls: 10,
          ttfb: 50,
          spt: 0,
          ctt: 0,
        },
        responseBody: isError ? 'ERROR' : 'OK',
        isSuccess: !isError,
        statusCode: isError ? 500 : 200,
        durationMs: 200,
        total_time_ms: 200,
        dns_response_time_ms: 20,
        tcp_connection_time_ms: 30,
        tls_handshake_time_ms: 10,
        time_to_first_byte_ms: 50,
        server_processing_time_ms: 50,
        content_transfer_time_ms: 20,
        createdAt: new Date(),
      });
    }

    return metrics;
  }

  function generateJitterSeries(
    count: number,
    baseTime: number,
    jitter: number,
  ): Metric[] {
    const metrics: Metric[] = [];
    const monitorId = crypto.randomUUID().toString();

    for (let i = 0; i < count; i++) {
      const noise = (Math.random() - 0.5) * jitter;
      const duration = baseTime + noise;

      metrics.push({
        id: i.toString(),
        monitor: { id: monitorId } as Monitor,
        region: 'IN',
        breakdown: {
          dns: 20,
          tcp: 30,
          tls: 10,
          ttfb: 50,
          spt: 0,
          ctt: 0,
        },
        responseBody: 'OK',
        isSuccess: true,
        statusCode: 200,
        durationMs: duration,
        total_time_ms: duration,
        dns_response_time_ms: 20,
        tcp_connection_time_ms: 30,
        tls_handshake_time_ms: 10,
        time_to_first_byte_ms: 50,
        server_processing_time_ms: 50,
        content_transfer_time_ms: 20,
        createdAt: new Date(),
      });
    }

    return metrics;
  }

  describe('Computation Methods', () => {
    describe('computeDistribution', () => {
      it('should compute distribution correctly', () => {
        const values = [100, 120, 140, 160, 180];
        const dist = service.computeDistribution(values);

        expect(dist.mean).toBe(140);
        expect(dist.variance).toBeGreaterThan(0);
        expect(dist.std).toBeGreaterThan(0);
        expect(dist.p95).toBeDefined();
        expect(dist.p99).toBeDefined();
      });

      it('should handle empty array', () => {
        const dist = service.computeDistribution([]);
        expect(dist).toEqual({
          mean: 0,
          std: 0,
          variance: 0,
          p95: 0,
          p99: 0,
        });
      });

      it('should compute percentiles correctly', () => {
        const values = Array.from({ length: 100 }, (_, i) => i + 1);
        const dist = service.computeDistribution(values);

        expect(dist.p95).toBeGreaterThan(94);
        expect(dist.p99).toBeGreaterThan(98);
      });
    });

    describe('detectAnomaly', () => {
      it('should detect anomaly with high Z-score', () => {
        const isAnomaly = service.detectAnomaly(500, 100, 50);
        expect(isAnomaly).toBe(true);
      });

      it('should not detect anomaly with low Z-score', () => {
        const isAnomaly = service.detectAnomaly(110, 100, 50);
        expect(isAnomaly).toBe(false);
      });

      it('should return false when std is 0', () => {
        const isAnomaly = service.detectAnomaly(100, 100, 0);
        expect(isAnomaly).toBe(false);
      });
    });

    describe('computeNetworkBackendRatio', () => {
      it('should compute ratios correctly', () => {
        const metric: Metric = {
          dns_response_time_ms: 20,
          tcp_connection_time_ms: 30,
          tls_handshake_time_ms: 10,
          time_to_first_byte_ms: 50,
          server_processing_time_ms: 50,
          total_time_ms: 200,
        } as any;

        const ratios = service.computeNetworkBackendRatio(metric);

        expect(ratios.networkRatio).toBe((20 + 30 + 10) / 200);
        expect(ratios.backendRatio).toBe((50 + 50) / 200);
      });

      it('should handle null values', () => {
        const metric: Metric = {
          dns_response_time_ms: null,
          tcp_connection_time_ms: null,
          time_to_first_byte_ms: 50,
          server_processing_time_ms: 50,
          total_time_ms: 200,
        } as any;

        const ratios = service.computeNetworkBackendRatio(metric);
        expect(ratios.networkRatio).toBe(0);
        expect(ratios.backendRatio).toBe((50 + 50) / 200);
      });
    });

    describe('detectDegradingComponent', () => {
      it('should detect TTFB degradation', () => {
        const metrics = generateTTFBDegradation(100, 200, 5);
        const component = service.detectDegradingComponent(metrics);
        expect(component).toBe('ttfb');
      });

      it('should return null for less than 5 metrics', () => {
        const metrics = generateMetricsSeries(4, 100, 0, MetricTrend.STAGNANT);
        const component = service.detectDegradingComponent(metrics);
        expect(component).toBeNull();
      });
    });

    describe('computeTrend', () => {
      it('should detect increasing trend', () => {
        const values = [100, 110, 120, 130, 140];
        const trend = service.computeTrend(values);
        expect(trend).toBe('increasing');
      });

      it('should detect decreasing trend', () => {
        const values = [140, 130, 120, 110, 100];
        const trend = service.computeTrend(values);
        expect(trend).toBe('decreasing');
      });

      it('should detect stable trend', () => {
        const values = [100, 100, 100, 100, 100];
        const trend = service.computeTrend(values);
        expect(trend).toBe('stable');
      });
    });

    describe('forecastLatency', () => {
      it('should forecast latency correctly', () => {
        const values = [100, 110, 120, 130, 140];
        const forecast = service.forecastLatency(values);

        expect(forecast.totalPrediction.length).toBe(4);
        expect(forecast.confidenceUpper.length).toBe(4);
        expect(forecast.confidenceLower.length).toBe(4);
        expect(forecast.totalPrediction[0]).toBeGreaterThan(0);
      });

      it('should handle less than 2 values', () => {
        const forecast = service.forecastLatency([100]);
        expect(forecast).toEqual({
          totalPrediction: [],
          confidenceUpper: [],
          confidenceLower: [],
        });
      });
    });

    describe('computeErrorRate', () => {
      it('should compute error rate correctly', () => {
        const metrics = generateErrorBurst(10, 3, 3);
        const errorRate = service.computeErrorRate(metrics);
        expect(errorRate).toBe(0.3);
      });

      it('should return 0 for empty array', () => {
        const errorRate = service.computeErrorRate([]);
        expect(errorRate).toBe(0);
      });
    });

    describe('predictSlaBreach', () => {
      it('should predict SLA breach when upper bound exceeds SLA', () => {
        const breach = service.predictSlaBreach([600, 700, 800], 500);
        expect(breach).toBe(true);
      });

      it('should not predict breach when within SLA', () => {
        const breach = service.predictSlaBreach([300, 400, 450], 500);
        expect(breach).toBe(false);
      });
    });
  });

  describe('Repository Method Delegation', () => {
    describe('getAnalytics', () => {
      it('should call repository method', async () => {
        const mockAnalytics: Analytics = {
          id: mockAnalyticsId,
        } as any;

        repository.getAnalyticsByMonitorAndRegion.mockResolvedValue(
          mockAnalytics,
        );

        const result = await service.getAnalytics(mockMonitorId, mockRegion);

        expect(result).toEqual(mockAnalytics);
        expect(repository.getAnalyticsByMonitorAndRegion).toHaveBeenCalledWith(
          mockMonitorId,
          mockRegion,
        );
      });
    });

    describe('getAllAnalyticsForMonitor', () => {
      it('should call repository method', async () => {
        const mockAnalytics: Analytics[] = [];
        repository.getAnalyticsByMonitorId.mockResolvedValue(mockAnalytics);

        const result = await service.getAllAnalyticsForMonitor(mockMonitorId);

        expect(result).toEqual(mockAnalytics);
        expect(repository.getAnalyticsByMonitorId).toHaveBeenCalledWith(
          mockMonitorId,
        );
      });
    });

    describe('getAnalyticsById', () => {
      it('should call repository method', async () => {
        const mockAnalytics: Analytics = {
          id: mockAnalyticsId,
        } as any;

        repository.getAnalyticsById.mockResolvedValue(mockAnalytics);

        const result = await service.getAnalyticsById(mockAnalyticsId);

        expect(result).toEqual(mockAnalytics);
        expect(repository.getAnalyticsById).toHaveBeenCalledWith(
          mockAnalyticsId,
        );
      });
    });

    describe('checkHealth', () => {
      it('should call repository health check', async () => {
        repository.getHealthStatus.mockResolvedValue({
          db: true,
          cache: true,
        });

        const result = await service.checkHealth();

        expect(result).toEqual({ db: true, cache: true });
        expect(repository.getHealthStatus).toHaveBeenCalled();
      });
    });

  describe('computeSlope', () => {
    it('should compute the correct slope for an increasing series', () => {
      const series = [1, 2, 3, 4, 5];
      const slope = service.computeSlope(series);
      expect(slope).toBe(1);
    });
  });

  describe('detectAnomaly', () => {
    it('should detect a spike as an anomaly', () => {
      const metrics = generateMetricsSeries(20, 100, 5, MetricTrend.STAGNANT);
      const spikeMetric = { total_time_ms: 1000 } as Metric;
      const allMetrics = [...metrics, spikeMetric];
      const times = allMetrics.map((m) => m.total_time_ms);
      const distribution = service.computeDistribution(times);
      const anomaly = service.detectAnomaly(
        spikeMetric.total_time_ms,
        distribution.mean,
        distribution.std,
      );
      expect(anomaly).toBe(true);
    });
  });

  describe('computeDistribution', () => {
    it('should handle jitter data', () => {
      const jitter = generateJitterSeries(100, 200, 50);
      const times = jitter.map(m => m.total_time_ms);
      const distribution = service.computeDistribution(times);
      expect(distribution.std).toBeGreaterThan(0);
      expect(distribution.mean).toBeCloseTo(200, -1);
    });
  });

  describe('computeErrorRate', () => {
    it('should return 0.5 for 50% errors', () => {
      const metrics = [
        { isSuccess: true },
        { isSuccess: false },
        { isSuccess: true },
        { isSuccess: false },
      ] as Metric[];
      const errorRate = service.computeErrorRate(metrics);
      expect(errorRate).toBe(0.5);
    });
  });

  describe('computeTrend', () => {
    it('should return "increasing" for an increasing series', () => {
      const values = [1, 2, 3, 4, 5];
      const trend = service.computeTrend(values);
      expect(trend).toBe('increasing');
    });
  });

  describe('computeNetworkBackendRatio', () => {
    it('should compute correct ratios', () => {
      const metric = {
        dns_response_time_ms: 10,
        tcp_connection_time_ms: 20,
        tls_handshake_time_ms: 30,
        time_to_first_byte_ms: 40,
        server_processing_time_ms: 50,
        total_time_ms: 200,
      } as Metric;
      const ratios = service.computeNetworkBackendRatio(metric);
      expect(ratios.networkRatio).toBe(0.3); // (10+20+30)/200
      expect(ratios.backendRatio).toBe(0.45); // (40+50)/200
    });
  });

  describe('predictSlaBreach', () => {
    it('should predict breach if upper bound exceeds SLA', () => {
      const upperBounds = [100, 200, 600, 300];
      const sla = 500;
      const breach = service.predictSlaBreach(upperBounds, sla);
      expect(breach).toBe(true);
    });

    it('should not predict breach if upper bound is within SLA', () => {
      const upperBounds = [100, 200, 400, 300];
      const sla = 500;
      const breach = service.predictSlaBreach(upperBounds, sla);
      expect(breach).toBe(false);
    });
  });

  describe('forecastLatency', () => {
    it('should return predictions with correct shape', () => {
      const values = [100, 110, 105, 115, 120];
      const forecast = service.forecastLatency(values);
      expect(forecast.totalPrediction.length).toBe(4);
      expect(forecast.confidenceUpper.length).toBe(4);
      expect(forecast.confidenceLower.length).toBe(4);
    });
  });
});
});
