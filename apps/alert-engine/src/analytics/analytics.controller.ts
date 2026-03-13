import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { AnalyticsService } from './analytics.service';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';
import { Topics } from '@app/kafka-topics';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LongPollingService } from '@app/common/long-polling/long-polling.service';

@Controller()
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);
  constructor(
    private readonly analyticsService: AnalyticsService,
  
    private readonly longPollingService: LongPollingService,
  ) { }

  private parseToCreateAnalyticsDto(data: unknown): CreateAnalyticsDto | null {
    let parsedData: unknown = data;

    if (typeof parsedData === 'string') {
      try {
        parsedData = JSON.parse(parsedData);
      } catch {
        return null;
      }
    }

    if (
      !parsedData ||
      typeof parsedData !== 'object' ||
      Array.isArray(parsedData)
    ) {
      return null;
    }

    return plainToInstance(CreateAnalyticsDto, parsedData);

  }

  @EventPattern(Topics.CHECK_ANALYTICS_REQUESTED)
  async create(@Payload() createAnalyticsDto: unknown) {
    const data = this.parseToCreateAnalyticsDto(createAnalyticsDto);
    if (!data) return;

    const errors = await validate(data);
    if (errors.length > 0) {
      this.logger.log('❌ Invalid message. Skipping.');
      return;
    }

    const [alert, monitor, metric]=await Promise.all([this.analyticsService.getAlertPolicy(data.MonitorId),this.analyticsService.getMonitor(data.MonitorId), this.analyticsService.getMetric(data.MetricId)]);
    const sla_letency=alert.rules?.rules.find(a=>a.metric=="sla_latency")?.threshold as number;
    const analytics = await this.analyticsService.processMetricAndUpdateAnalytics(metric, monitor.id,data.Region, sla_letency);
    await this.longPollingService.publishUpdate(`analytics:${monitor.id}`, analytics)
    return null;
  }
}
