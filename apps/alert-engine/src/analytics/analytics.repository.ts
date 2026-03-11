import { Injectable, Logger, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Analytics, Monitor, Metric, AlertPolicy, Alert } from '@app/database';
import Redis from 'ioredis';
import { Inject } from '@nestjs/common';

/**
 * Analytics Repository - handles all data access for analytics with Redis caching
 * Manages metrics rotation, efficient querying, and cache invalidation
 */
@Injectable()
export class AnalyticsRepository {
  private readonly logger = new Logger(AnalyticsRepository.name);
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MAX_METRICS_CAPACITY = 20;
  private readonly ANALYTICS_CACHE_PREFIX = 'analytics:';
  private readonly MONITOR_ANALYTICS_CACHE_PREFIX = 'monitor_analytics:';

  constructor(
    @InjectRepository(Analytics)
    private readonly analyticsRepo: Repository<Analytics>,

    @InjectRepository(Monitor)
    private readonly monitorRepo: Repository<Monitor>,

    @InjectRepository(Metric)
    private readonly metricRepo: Repository<Metric>,

    @InjectRepository(AlertPolicy)
    private readonly alertPolicyRepo: Repository<AlertPolicy>,

    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,

    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}

  /**
   * Create a new alert record
   * @param alertData - partial alert data (monitor required)
   * @returns saved Alert entity
   */
  async createAlert(alertData: Partial<Alert>): Promise<Alert> {
    try {
      if (!alertData.monitor?.id) {
        throw new BadRequestException('Monitor ID is required to create alert');
      }

      const alertEntity = this.alertRepo.create(alertData);
      const saved = await this.alertRepo.save(alertEntity);
      this.logger.debug(
        `Alert created for monitor ${alertData.monitor.id} with message: ${alertData.message}`,
      );
      return saved;
    } catch (error) {
      this.logger.error(
        `Failed to create alert: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to create alert',
      );
    }
  }

  /**
   * Find a recent alert matching monitor/message since a given date
   * Used to avoid duplicate notifications within a time window
   * @param monitorId - UUID of monitor
   * @param message - alert message text
   * @param since - Date threshold (e.g. one hour ago)
   * @returns Alert or null
   */
  async findRecentAlert(
    monitorId: string,
    message: string,
    since: Date,
  ): Promise<Alert | null> {
    try {
      this.validateUUID(monitorId);

      const alert = await this.alertRepo.findOne({
        where: {
          monitor: { id: monitorId },
          message,
          createdAt: MoreThan(since),
        },
        order: { createdAt: 'DESC' },
      });

      return alert || null;
    } catch (error) {
      // If invalid uuid or other error, just log and return null so caller can proceed
      this.logger.warn(
        `Error checking recent alert for monitor ${monitorId}: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      return null;
    }
  }

  /**
   * Create or update analytics with automatic metrics rotation
   * Removes oldest metric if capacity (100) is exceeded
   * @param analyticData - Analytics data to save
   * @returns Created or updated Analytics entity
   */
  async createOrUpdateAnalytics(analyticData: Partial<Analytics>): Promise<Analytics> {
    try {
      if (!analyticData.monitor?.id) {
        throw new BadRequestException('Monitor ID is required');
      }

      if (!analyticData.region) {
        throw new BadRequestException('Region is required');
      }

      // Fetch existing analytics for this monitor and region
      const existingAnalytics = await this.analyticsRepo.findOne({
        where: {
          monitor: { id: analyticData.monitor.id },
          region: analyticData.region,
        },
      });

      let metricsToSave = analyticData.recentMetrics ?? [];

      if (existingAnalytics?.recentMetrics) {
        // Merge with existing metrics
        metricsToSave = [...existingAnalytics.recentMetrics, ...metricsToSave];

        // Rotate metrics - keep only latest MAX_METRICS_CAPACITY
        if (metricsToSave.length > this.MAX_METRICS_CAPACITY) {
          metricsToSave = metricsToSave.slice(-this.MAX_METRICS_CAPACITY);
        }
      }

      // Prepare analytics data
      const analyticsEntity = {
        ...analyticData,
        recentMetrics: metricsToSave,
      };

      // Save or update
      let savedAnalytics: Analytics;
      if (existingAnalytics) {
        await this.analyticsRepo.update(existingAnalytics.id, analyticsEntity);
        savedAnalytics = { ...existingAnalytics, ...analyticsEntity };
      } else {
        savedAnalytics = await this.analyticsRepo.save(
          this.analyticsRepo.create(analyticsEntity),
        );
      }

      // Invalidate cache
      await this.invalidateAnalyticsCache(
        analyticData.monitor.id,
        analyticData.region,
      );

      this.logger.debug(
        `Analytics saved successfully for monitor ${analyticData.monitor.id}, region ${analyticData.region}`,
      );

      return savedAnalytics;
    } catch (error) {
      this.logger.error(
        `Failed to create/update analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to save analytics data. Please try again later.',
      );
    }
  }

  /**
   * Get analytics by monitor ID and region with caching
   * @param monitorId - UUID of the monitor
   * @param region - Region name
   * @returns Analytics entity or null if not found
   */
  async getAnalyticsByMonitorAndRegion(
    monitorId: string,
    region: string,
  ): Promise<Analytics | null> {
    try {
      this.validateUUID(monitorId);

      if (!region) {
        throw new BadRequestException('Region is required');
      }

      // Check cache first
      const cacheKey = `${this.ANALYTICS_CACHE_PREFIX}${monitorId}:${region}`;
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        this.logger.debug(`Cache hit for analytics: ${cacheKey}`);
        return JSON.parse(cached) as Analytics;
      }

      // Query database
      const analytics = await this.analyticsRepo.findOne({
        where: {
          monitor: { id: monitorId },
          region,
        },
        relations: ['monitor'],
      });

      if (analytics) {
        // Cache the result
        await this.redis.setex(
          cacheKey,
          this.CACHE_TTL,
          JSON.stringify(analytics),
        );
        this.logger.debug(`Cached analytics for monitor ${monitorId}, region ${region}`);
      }

      return analytics;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Failed to get analytics for monitor ${monitorId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve analytics data.',
      );
    }
  }

  /**
   * Get all analytics for a specific monitor
   * @param monitorId - UUID of the monitor
   * @returns Array of Analytics entities
   */
  async getAnalyticsByMonitorId(monitorId: string): Promise<Analytics[]> {
    try {
      this.validateUUID(monitorId);

      // Check cache first
      const cacheKey = `${this.MONITOR_ANALYTICS_CACHE_PREFIX}${monitorId}`;
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        this.logger.debug(`Cache hit for monitor analytics: ${cacheKey}`);
        return JSON.parse(cached) as Analytics[];
      }

      const allAnalytics = await this.analyticsRepo.find({
        where: { monitor: { id: monitorId } },
        relations: ['monitor'],
        order: { createdAt: 'DESC' },
      });

      if (allAnalytics.length > 0) {
        await this.redis.setex(
          cacheKey,
          this.CACHE_TTL,
          JSON.stringify(allAnalytics),
        );
      }

      return allAnalytics;
    } catch (error) {      if (error instanceof BadRequestException) {
        throw error;
      }      this.logger.error(
        `Failed to get analytics for monitor ${monitorId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve analytics data.',
      );
    }
  }

  /**
   * Get analytics by ID
   * @param analyticsId - UUID of the analytics record
   * @returns Analytics entity
   */
  async getAnalyticsById(analyticsId: string): Promise<Analytics> {
    try {
      this.validateUUID(analyticsId);

      const analytics = await this.analyticsRepo.findOne({
        where: { id: analyticsId },
        relations: ['monitor'],
      });

      if (!analytics) {
        throw new NotFoundException(
          `Analytics with ID ${analyticsId} not found`,
        );
      }

      return analytics;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Failed to get analytics by ID ${analyticsId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve analytics data.',
      );
    }
  }

  /**
   * Find monitor by UUID
   * @param monitorId - UUID of the monitor
   * @returns Monitor entity with relations
   */
  async findMonitorById(monitorId: string): Promise<Monitor> {
    try {
      this.validateUUID(monitorId);

      const monitor = await this.monitorRepo.findOne({
        where: { id: monitorId },
        relations: ['project', 'alertPolicy'],
      });

      if (!monitor) {
        throw new NotFoundException(
          `Monitor with ID ${monitorId} not found`,
        );
      }

      return monitor;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Failed to find monitor ${monitorId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Failed to retrieve monitor data.');
    }
  }

  /**
   * Find metric by UUID
   * @param metricId - UUID of the metric
   * @returns Metric entity with relations
   */
  async findMetricById(metricId: string): Promise<Metric> {
    try {
      this.validateUUID(metricId);

      const metric = await this.metricRepo.findOne({
        where: { id: metricId },
        relations: ['monitor'],
      });

      if (!metric) {
        throw new NotFoundException(
          `Metric with ID ${metricId} not found`,
        );
      }

      return metric;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Failed to find metric ${metricId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Failed to retrieve metric data.');
    }
  }

    /**
   * Find alert policy by monitor UUID reference
   * @param MonitorId - UUID of the Monitor Id
   * @returns AlertPolicy entity with relations
   */
  async findAlertPolicyByMonitorId(MonitorId: string): Promise<AlertPolicy> {
    try {
      this.validateUUID(MonitorId);

      const policy = await this.alertPolicyRepo.findOne({
        where: { monitors: { id: MonitorId } },
        relations: ['monitors'],
      });

      if (!policy) {
        throw new NotFoundException(
          `Alert Policy for Monitor ID ${MonitorId} not found`,
        );
      }

      return policy;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Failed to find alert policy for monitor ${MonitorId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve alert policy data.',
      );
    }
  }


  /**
   * Find alert policy by UUID
   * @param policyId - UUID of the alert policy
   * @returns AlertPolicy entity with relations
   */
  async findAlertPolicyById(policyId: string): Promise<AlertPolicy> {
    try {
      this.validateUUID(policyId);

      const policy = await this.alertPolicyRepo.findOne({
        where: { id: policyId },
        relations: ['monitor'],
      });

      if (!policy) {
        throw new NotFoundException(
          `Alert Policy with ID ${policyId} not found`,
        );
      }

      return policy;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Failed to find alert policy ${policyId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve alert policy data.',
      );
    }
  }

  /**
   * Get recent metrics for a monitor (with limit)
   * @param monitorId - UUID of the monitor
   * @param limit - Number of recent metrics to fetch (default 20)
   * @returns Array of Metric entities
   */
  async getRecentMetricsForMonitor(
    monitorId: string,
    limit: number = 20,
  ): Promise<Metric[]> {
    try {
      this.validateUUID(monitorId);

      if (limit <= 0 || limit > 1000) {
        throw new BadRequestException(
          'Limit must be between 1 and 1000',
        );
      }

      const metrics = await this.metricRepo.find({
        where: { monitor: { id: monitorId } },
        order: { createdAt: 'DESC' },
        take: limit,
      });

      return metrics;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Failed to get recent metrics for monitor ${monitorId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve metrics data.',
      );
    }
  }

  /**
   * Delete analytics by ID
   * @param analyticsId - UUID of the analytics to delete
   * @returns Boolean indicating success
   */
  async deleteAnalytics(analyticsId: string): Promise<boolean> {
    try {
      this.validateUUID(analyticsId);

      const result = await this.analyticsRepo.delete({ id: analyticsId });
      const deleted = result.affected != null && result.affected > 0;

      if (deleted) {
        // Invalidate all related caches
        const keys = await this.redis.keys(`${this.ANALYTICS_CACHE_PREFIX}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }

        this.logger.debug(`Analytics ${analyticsId} deleted successfully`);
      }

      return deleted;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Failed to delete analytics ${analyticsId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Failed to delete analytics.',
      );
    }
  }

  /**
   * Get analytics count for a monitor
   * @param monitorId - UUID of the monitor
   * @returns Count of analytics records
   */
  async getAnalyticsCountByMonitor(monitorId: string): Promise<number> {
    try {
      this.validateUUID(monitorId);

      return await this.analyticsRepo.count({
        where: { monitor: { id: monitorId } },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Failed to count analytics for monitor ${monitorId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve analytics count.',
      );
    }
  }

  /**
   * Clear cache for a specific analytics entry
   * @param monitorId - UUID of the monitor
   * @param region - Region name
   */
  private async invalidateAnalyticsCache(
    monitorId: string,
    region: string,
  ): Promise<void> {
    try {
      const analyticsKey = `${this.ANALYTICS_CACHE_PREFIX}${monitorId}:${region}`;
      const monitorAnalyticsKey = `${this.MONITOR_ANALYTICS_CACHE_PREFIX}${monitorId}`;

      await Promise.all([
        this.redis.del(analyticsKey),
        this.redis.del(monitorAnalyticsKey),
      ]);

      this.logger.debug(
        `Cache invalidated for monitor ${monitorId}, region ${region}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Don't throw - cache invalidation failure shouldn't block the main operation
    }
  }

  /**
   * Clear all analytics cache
   */
  async clearAllCache(): Promise<void> {
    try {
      const analyticsKeys = await this.redis.keys(
        `${this.ANALYTICS_CACHE_PREFIX}*`,
      );
      const monitorKeys = await this.redis.keys(
        `${this.MONITOR_ANALYTICS_CACHE_PREFIX}*`,
      );

      const allKeys = [...analyticsKeys, ...monitorKeys];
      if (allKeys.length > 0) {
        await this.redis.del(...allKeys);
      }

      this.logger.debug('All analytics cache cleared');
    } catch (error) {
      this.logger.warn(
        `Failed to clear all cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Validate UUID format
   * @param uuid - UUID string to validate
   * @throws BadRequestException if UUID is invalid
   */
  private validateUUID(uuid: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
      throw new BadRequestException(`Invalid UUID format: ${uuid}`);
    }
  }

  /**
   * Get health status of the repository (useful for monitoring)
   */
  async getHealthStatus(): Promise<{ db: boolean; cache: boolean }> {
    try {
      // Test database connection
      const dbHealth = await this.analyticsRepo
        .find({ take: 1 })
        .then(() => true)
        .catch(() => false);

      // Test Redis connection
      const cacheHealth = await this.redis
        .ping()
        .then(() => true)
        .catch(() => false);

      return {
        db: dbHealth,
        cache: cacheHealth,
      };
    } catch (error) {
      this.logger.error(
        `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        db: false,
        cache: false,
      };
    }
  }
}
