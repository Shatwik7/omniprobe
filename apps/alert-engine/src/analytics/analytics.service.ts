import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Analytics, Metric, Monitor, AlertPolicy, AlertType, Alert } from '@app/database';
import { AnalyticsRepository } from './analytics.repository';
import { KafkaProducerService } from './kafka-producer.service';

/**
 * Analytics Service - Business logic for analytics computation and persistence
 * Combines metric analysis with repository operations
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly analyticsRepository: AnalyticsRepository,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  /**
   * Main analytics computation workflow
   * Analyzes a new metric, updates analytics, and persists to database
   * @param newMetric - New metric to analyze
   * @param monitorId - UUID of the monitor
   * @param region - Region name (default:'IN')
   * @param slaLatency - SLA latency threshold (default: 2000ms)
   * @param windowSize - Size of the metrics window (default: 20)
   * @returns Saved Analytics entity
   */
  async processMetricAndUpdateAnalytics(
    newMetric: Metric,
    monitorId: string,
    region: string,
    slaLatency: number = 2000,
    windowSize: number = 20,
  ): Promise<Analytics> {
    try {
      // Validate inputs
      if (!monitorId || !region) {
        throw new BadRequestException('Monitor ID and region are required');
      }

      // Fetch existing analytics or create new
      let lastAnalytics =
        await this.analyticsRepository.getAnalyticsByMonitorAndRegion(
          monitorId,
          region,
        );

      // Compute analytics from metric
      const computedAnalytics = this.analyzeMetrics(
        newMetric,
        lastAnalytics,
        slaLatency,
        windowSize,
      );

      // Get monitor reference
      const monitor = await this.analyticsRepository.findMonitorById(monitorId);

      // Prepare analytics data for persistence
      const analyticsToSave: Partial<Analytics> = {
        monitor,
        region,
        rollingAverage: computedAnalytics.rollingAverage,
        rollingStdDev: computedAnalytics.rollingStdDev,
        variance: computedAnalytics.variance,
        p95: computedAnalytics.p95,
        p99: computedAnalytics.p99,
        anomalyDetected: computedAnalytics.anomalyDetected,
        degradingComponent: computedAnalytics.degradingComponent,
        networkRatio: computedAnalytics.networkRatio,
        backendRatio: computedAnalytics.backendRatio,
        forecast: computedAnalytics.forecast,
        predictedSlaBreach: computedAnalytics.predictedSlaBreach,
        errorRate: computedAnalytics.errorRate,
        trend: computedAnalytics.trend,
        recentMetrics: computedAnalytics.recentMetrics,
      };

      // Save to database with automatic metrics rotation
      const savedAnalytics =
        await this.analyticsRepository.createOrUpdateAnalytics(analyticsToSave);

      this.logger.log(
        `Analytics processed and saved for monitor ${monitorId}, region ${region}`,
      );

      // create an alert based on extracted analytics, but only for anomalies
      try {
        if (computedAnalytics.anomalyDetected) {
          const alertMessage = JSON.stringify(computedAnalytics);

          // avoid duplicates within the last hour
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          const recent = await this.analyticsRepository.findRecentAlert(
            monitorId,
            alertMessage,
            oneHourAgo,
          );

          if (!recent) {
            // choose type heuristically
            let type: AlertType = AlertType.ANOMALY;
            if (computedAnalytics.predictedSlaBreach) {
              type = AlertType.SLA_BREACH;
            } else if (computedAnalytics.errorRate && computedAnalytics.errorRate > 0) {
              type = AlertType.ERROR_RATE;
            } else if (computedAnalytics.degradingComponent) {
              type = AlertType.DEGRADATION;
            }

            let alert=await this.analyticsRepository.createAlert({
              monitor,
              metric: newMetric,
              message: alertMessage,
              type,
            });

            // notify via kafka
            const policy = await this.analyticsRepository.findAlertPolicyByMonitorId(
              monitorId,
            );
            const channelInfo = policy.notificationChannels?.[0];
            if (channelInfo) {
              const kafkaEvent = {
                message: alertMessage,
                channel: channelInfo.channelType,
                address: channelInfo.address,
                title : `ALERT : ${type} detected for monitor ${monitor.name}`,
                Alert: alert.id,
                Project: monitor.project.id,
              };
              await this.kafkaProducer.emitAlertTriggered(kafkaEvent);
            }
          }
        }
      } catch (err) {
        // log but don't fail main workflow
        this.logger.warn(
          `failed to create or send alert: ${err instanceof Error ? err.message : err}`,
        );
      }

      return savedAnalytics;
    } catch (error) {
      this.logger.error(
        `Failed to process metric and update analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error; // Re-throw to let caller handle
    }
  }

  /**
   * Get analytics by monitor and region
   * @param monitorId - UUID of the monitor
   * @param region - Region name
   * @returns Analytics entity or null
   */
  async getAnalytics(monitorId: string, region: string): Promise<Analytics | null> {
    return this.analyticsRepository.getAnalyticsByMonitorAndRegion(
      monitorId,
      region,
    );
  }

  /**
   * Get all analytics for a monitor across all regions
   * @param monitorId - UUID of the monitor
   * @returns Array of Analytics entities
   */
  async getAllAnalyticsForMonitor(monitorId: string): Promise<Analytics[]> {
    return this.analyticsRepository.getAnalyticsByMonitorId(monitorId);
  }

  /**
   * Get analytics by ID
   * @param analyticsId - UUID of the analytics
   * @returns Analytics entity
   */
  async getAnalyticsById(analyticsId: string): Promise<Analytics> {
    return this.analyticsRepository.getAnalyticsById(analyticsId);
  }

  /**
   * Get monitor details by ID
   * @param monitorId - UUID of the monitor
   * @returns Monitor entity with relations
   */
  async getMonitor(monitorId: string): Promise<Monitor> {
    return this.analyticsRepository.findMonitorById(monitorId);
  }

  /**
   * Get metric details by ID
   * @param metricId - UUID of the metric
   * @returns Metric entity
   */
  async getMetric(metricId: string): Promise<Metric> {
    return this.analyticsRepository.findMetricById(metricId);
  }

  /**
   * Get alert policy details by ID
   * @param policyId - UUID of the alert policy
   * @returns AlertPolicy entity
   */
  async getAlertPolicy(policyId: string): Promise<AlertPolicy> {
    return this.analyticsRepository.findAlertPolicyByMonitorId(policyId);
  }

  /**
   * Get recent metrics for a monitor
   * @param monitorId - UUID of the monitor
   * @param limit - Number of metrics to fetch
   * @returns Array of Metric entities
   */
  async getRecentMetrics(monitorId: string, limit: number = 20): Promise<Metric[]> {
    return this.analyticsRepository.getRecentMetricsForMonitor(monitorId, limit);
  }

  /**
   * Delete analytics record
   * @param analyticsId - UUID of the analytics to delete
   * @returns Boolean indicating success
   */
  async deleteAnalytics(analyticsId: string): Promise<boolean> {
    return this.analyticsRepository.deleteAnalytics(analyticsId);
  }

  /**
   * Clear all caches (useful for admin operations)
   */
  async clearCache(): Promise<void> {
    return this.analyticsRepository.clearAllCache();
  }

  /**
   * Check repository health
   * @returns Object with db and cache health status
   */
  async checkHealth(): Promise<{ db: boolean; cache: boolean }> {
    return this.analyticsRepository.getHealthStatus();
  }

  /**
   * Compute statistical distribution from metric values
   * @param values - Array of numeric values
   * @returns Distribution metrics (mean, std, variance, p95, p99)
   */
  computeDistribution(values: number[]) {
    if (values.length === 0) {
      return { mean: 0, std: 0, variance: 0, p95: 0, p99: 0 };
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
      values.length;

    const std = Math.sqrt(variance);

    const sorted = [...values].sort((a, b) => a - b);

    const p95 = sorted[Math.floor(0.95 * sorted.length)];
    const p99 = sorted[Math.floor(0.99 * sorted.length)];

    return {
      mean,
      std,
      variance,
      p95,
      p99,
    };
  }

  /**
   * Detect anomalies using Z-score method
   * @param value - Value to test
   * @param mean - Mean of the distribution
   * @param std - Standard deviation
   * @returns Boolean indicating if anomaly detected
   */
  detectAnomaly(value: number, mean: number, std: number): boolean {
    if (std === 0) return false;

    const z = Math.abs(value - mean) / std;

    return z > 3;
  }

  /**
   * Compute network vs backend ratio from metric
   * @param metric - Metric entity
   * @returns Object with networkRatio and backendRatio
   */
  computeNetworkBackendRatio(metric: Metric) {
    const network =
      (metric.dns_response_time_ms ?? 0) +
      (metric.tcp_connection_time_ms ?? 0) +
      (metric.tls_handshake_time_ms ?? 0);

    const backend =
      (metric.time_to_first_byte_ms ?? 0) +
      (metric.server_processing_time_ms ?? 0);

    const total = metric.total_time_ms || 1;

    return {
      networkRatio: network / total,
      backendRatio: backend / total,
    };
  }

  /**
   * Identify degrading components by analyzing recent metrics
   * @param metrics - Array of recent metrics
   * @returns Component name with worst trend or null
   */
  detectDegradingComponent(metrics: Metric[]): string | null {
    if (metrics.length < 5) return null;

    const components = {
      dns: metrics.map((m) => m.dns_response_time_ms),
      tcp: metrics.map((m) => m.tcp_connection_time_ms),
      tls: metrics.map((m) => m.tls_handshake_time_ms),
      ttfb: metrics.map((m) => m.time_to_first_byte_ms),
      processing: metrics.map((m) => m.server_processing_time_ms),
      transfer: metrics.map((m) => m.content_transfer_time_ms),
    };

    let worstComponent = '';
    let maxSlope = -Infinity;

    for (const key in components) {
      const values = components[key].filter(
        (v) => v !== null && v !== undefined,
      ) as number[];
      if (values.length < 2) continue;

      const slope = this.computeSlope(values);

      if (slope > maxSlope) {
        maxSlope = slope;
        worstComponent = key;
      }
    }

    return worstComponent;
  }

  /**
   * Compute linear regression slope
   * @param values - Array of values
   * @returns Slope value
   */
  computeSlope(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;

    const x = Array.from({ length: n }, (_, i) => i + 1);

    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (x[i] - meanX) * (values[i] - meanY);
      denominator += Math.pow(x[i] - meanX, 2);
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Forecast future latency using exponential smoothing
   * @param values - Array of historical latency values
   * @returns Forecast with predictions and confidence bounds
   */
  forecastLatency(values: number[]) {
    if (values.length < 2) {
      return {
        totalPrediction: [],
        confidenceUpper: [],
        confidenceLower: [],
      };
    }

    const alpha = 0.3; // Level smoothing
    const beta = 0.2; // Trend smoothing

    let level = values[0];
    let trend = values[1] - values[0];

    for (let i = 1; i < values.length; i++) {
      const value = values[i];
      const prevLevel = level;
      level = alpha * value + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
    }

    // Generate 4-step ahead forecast
    const predictions: number[] = [];
    for (let k = 1; k <= 4; k++) {
      predictions.push(Math.max(0, level + k * trend)); // Ensure non-negative
    }

    const std = this.computeDistribution(values).std;

    // 95% confidence interval
    const confidenceUpper = predictions.map((p) => p + 1.96 * std);
    const confidenceLower = predictions.map((p) => Math.max(0, p - 1.96 * std));

    return {
      totalPrediction: predictions,
      confidenceUpper,
      confidenceLower,
    };
  }

  /**
   * Predict if SLA breach is likely based on forecast
   * @param upperBounds - Upper confidence bounds from forecast
   * @param sla - SLA latency threshold
   * @returns Boolean indicating SLA breach risk
   */
  predictSlaBreach(upperBounds: number[], sla: number): boolean {
    for (const value of upperBounds) {
      if (value > sla) return true;
    }
    return false;
  }

  /**
   * Compute error rate from metrics
   * @param metrics - Array of metric entities
   * @returns Error rate (0-1)
   */
  computeErrorRate(metrics: Metric[]): number {
    if (metrics.length === 0) return 0;
    const errorCount = metrics.filter((m) => !m.isSuccess).length;
    return errorCount / metrics.length;
  }

  /**
   * Determine trend direction from values
   * @param values - Array of values
   * @returns Trend as string: 'increasing', 'decreasing', or 'stable'
   */
  computeTrend(values: number[]): string {
    if (values.length < 2) {
      return 'stable';
    }
    const slope = this.computeSlope(values);

    if (slope > 0.5) return 'increasing';
    if (slope < -0.5) return 'decreasing';
    return 'stable';
  }

  /**
   * Core analytics computation method
   * Aggregates all analysis into a single Analytics entity
   * @param newMetric - New metric to analyze
   * @param lastAnalytics - Previous analytics record (for comparison)
   * @param slaLatency - SLA threshold
   * @param windowSize - Metrics window size
   * @returns Computed Analytics object
   */
  private analyzeMetrics(
    newMetric: Metric,
    lastAnalytics: Analytics | null,
    slaLatency = 500,
    windowSize = 100,
  ): Partial<Analytics> {
    const lastMetrics = lastAnalytics?.recentMetrics ?? [];
    const recentMetrics = [...lastMetrics, newMetric].slice(-windowSize);

    const totalTimes = recentMetrics
      .map((m) => m.total_time_ms)
      .filter((t) => t !== null && t !== undefined) as number[];

    const distribution = this.computeDistribution(totalTimes);

    const anomaly = this.detectAnomaly(
      newMetric.total_time_ms,
      distribution.mean,
      distribution.std,
    );

    const degradingComponent = this.detectDegradingComponent(recentMetrics);

    const ratios = this.computeNetworkBackendRatio(newMetric);

    const forecast = this.forecastLatency(totalTimes);

    const slaRisk = this.predictSlaBreach(forecast.confidenceUpper, slaLatency);

    const errorRate = this.computeErrorRate(recentMetrics);

    const trend = this.computeTrend(totalTimes);

    return {
      rollingAverage: distribution.mean,
      rollingStdDev: distribution.std,
      variance: distribution.variance,
      p95: distribution.p95,
      p99: distribution.p99,
      anomalyDetected: anomaly,
      degradingComponent,
      networkRatio: ratios.networkRatio,
      backendRatio: ratios.backendRatio,
      forecast,
      predictedSlaBreach: slaRisk,
      errorRate,
      trend,
      recentMetrics,
    };
  }
}

