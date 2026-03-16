import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ClientKafka } from '@nestjs/microservices';

import { Monitor, Metric, Incident, AlertPolicy, NotificationChannel } from '@app/database';
import { IncidentSeverity, IncidentStatus } from '@app/database/entity/incident.entity';

import {
  CheckExecutionCompletedEvent,
  CheckExecutionFailedEvent,
  HttpCheckError,
  Topics,
} from '@app/kafka-topics';
import { IncidentTriggeredEvent } from '@app/kafka-topics/dtos/IncidentTriggeredEvent.dto';

@Injectable()
export class IngestServiceService {
  private readonly logger = new Logger('IngestServiceService');
  constructor(
    @InjectRepository(Monitor)
    private readonly monitorRepo: Repository<Monitor>,

    @InjectRepository(Metric)
    private readonly metricRepo: Repository<Metric>,

    @InjectRepository(Incident)
    private readonly incidentRepo: Repository<Incident>,

    @InjectRepository(AlertPolicy)
    private readonly alertPolicyRepo: Repository<AlertPolicy>,

    @Inject('KAFKA_PRODUCER')
    private readonly kafkaClient: ClientKafka,
  ) { }

  /**
   * COMPLETION EVENT
   * @param event CheckExecutionCompltedEvent (libs/kafka-topic)
   * @returns
   */
  async handleCheckCompletion(event: CheckExecutionCompletedEvent) {
    this.logger.log('Received CheckExecutionCompletedEvent', event);


    const monitor = await this.monitorRepo.findOne({
      where: { id: event.Request.checkId, isActive: true, isLive: true },
      relations: ['alertPolicy', 'project'],
    });
    if (!monitor) return;

    const success = this.isResponseValid(monitor, event);

    await this.storeSuccessMetric(monitor, event, success);

    const openIncident = await this.getOpenIncident(monitor.id);
    if (!success) {
      if (!openIncident) {
        await this.createIncident(monitor, 'BAD_RESPONSE', null);
      }
      return;
    }

    if (openIncident) {
      await this.resolveIncident(openIncident);
    }
  }

  /**
   * FAILURE EVENT
   * @param event CheckExecutionFailedEvent (libs/kafka-topic)
   * @returns
   */
  async handleCheckFailure(event: CheckExecutionFailedEvent) {
    const monitor = await this.monitorRepo.findOne({
      where: { id: event.Request.checkId, isActive: true, isLive: true },
      relations: ['alertPolicy', 'project'],
    });

    if (!monitor) return;

    await this.storeFailureMetric(monitor, event);

    const openIncident = await this.getOpenIncident(monitor.id);

    if (!openIncident) {
      await this.createIncident(monitor, event.Response.error_type, event.Response);
    }
  }

  /**
   * VALIDATION LOGIC
   * @param monitor Monitor (libs/database)
   * @param event CheckExecutionCompletedEvent (libs/kafka-topic)
   * @returns
   */
  private isResponseValid(
    monitor: Monitor,
    event: CheckExecutionCompletedEvent,
  ) {
    if (
      monitor.expectedStatus &&
      (event.Response.status_code ?? 0) !== monitor.expectedStatus
    )
      return false;

    return true;
  }

  /**
   * METRIC STORAGE
   * @param monitor Monitor (libs/database)
   * @param event CheckExecutionCompletedEvent (libs/kafka-topic)
   * @param success : True|False
   */
  private async storeSuccessMetric(
    monitor: Monitor,
    event: CheckExecutionCompletedEvent,
    success: boolean,
  ) {
    const timings = this.getMetricTimings(event.Response);
    const metric = this.metricRepo.create({
      monitor,
      isSuccess: success,
      statusCode: event.Response.status_code ?? 0,
      durationMs: timings.total,
      breakdown: timings.breakdown,
      total_time_ms: timings.total,
      dns_response_time_ms: timings.dns,
      tcp_connection_time_ms: timings.tcp,
      server_processing_time_ms: timings.processing,
      tls_handshake_time_ms: timings.tls,
      time_to_first_byte_ms: timings.firstByte,
      content_transfer_time_ms: timings.transfer,
      region: event.region,
    });

    await this.metricRepo.save(metric);
  }

  /**
   * FAILURE METRIC STORAGE
   * @param monitor Monitor (libs/database)
   */
  private async storeFailureMetric(
    monitor: Monitor,
    event: CheckExecutionFailedEvent,
  ) {
    const timings = this.getMetricTimings(event.Response.partial_timings);
    const metric = this.metricRepo.create({
      monitor,
      isSuccess: false,
      statusCode: 0,
      durationMs: timings.total,
      breakdown: timings.breakdown,
      dns_response_time_ms: timings.dns,
      tcp_connection_time_ms: timings.tcp,
      tls_handshake_time_ms: timings.tls,
      time_to_first_byte_ms: timings.firstByte,
      server_processing_time_ms: timings.processing,
      content_transfer_time_ms: timings.transfer,
      total_time_ms: timings.total,
      region: event.region,
      responseBody: event.Response.error_message,
    });

    await this.metricRepo.save(metric);
  }

  private getMetricTimings(
    timings?: Partial<CheckExecutionCompletedEvent['Response']>,
  ) {
    const dns = Math.max(timings?.dns_lookup_end ?? 0, 0);
    const tcpStart = Math.max(timings?.tcp_beginning_start ?? dns, 0);
    const tcpEnd = Math.max(timings?.tcp_end ?? tcpStart, tcpStart);
    const tlsStart = Math.max(timings?.tls_start ?? tcpEnd, tcpEnd);
    const tlsEnd = Math.max(timings?.tls_end ?? tlsStart, tlsStart);
    const ttfb = Math.max(timings?.ttfb ?? tlsEnd, tlsEnd);
    const total = Math.max(timings?.tdt ?? ttfb, ttfb);
    const processing = Math.max(timings?.server_processing_time ?? 0, 0);
    const tcp = Math.max(tcpEnd - tcpStart, 0);
    const tls = Math.max(tlsEnd - tlsStart, 0);
    const firstByte = Math.max(ttfb - tlsEnd, 0);
    const transfer = Math.max(total - ttfb, 0);

    return {
      dns,
      tcp,
      tls,
      firstByte,
      processing,
      transfer,
      total,
      breakdown: {
        dns,
        tcp,
        tls,
        ttfb: firstByte,
        spt: processing,
        ctt: transfer,
      },
    };
  }

  /**
   * Get Active Incident for a Monitor
   * @param monitorId : UUID
   * @returns
   */
  private getOpenIncident(monitorId: string) {
    return this.incidentRepo.findOne({
      where: { monitor: { id: monitorId }, status: In([IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED]) },
    });
  }

  /**
   * Create New Incident
   * @param monitor Monitor (libs/database)
   * @param reason
   */
  private buildIncidentTriggeredMessage(
    monitor: Monitor,
    reason: string,
    incidentId: string,
    channel: string,
    address: string,
  ): IncidentTriggeredEvent {
    return {
      title: `Incident for monitor ${monitor.name} : System Down`,
      message: `An incident has been triggered for monitor ${monitor.name} due to ${reason}`,
      channel,
      address,
      Incident: incidentId,
      Project: monitor.project.id,
    };
  }

  private async createIncident(
    monitor: Monitor,
    reason: string,
    httpCheckError: HttpCheckError | null,
  ) {
    const incident = this.incidentRepo.create({
      monitor,
      status: IncidentStatus.OPEN,
      summary: JSON.stringify(httpCheckError),
      severity: IncidentSeverity.CRITICAL,
    });
    await this.incidentRepo.save(incident);
    this.logger.log(`Created incident ${incident.id} for monitor ${monitor.name} due to ${reason}`);

    
    const alertPolicy = monitor.alertPolicy?.id
      ? await this.alertPolicyRepo.findOne({
          where: { id: monitor.alertPolicy.id },
          relations: ['notificationChannels'],
        })
      : null;

    await this.monitorRepo.update(monitor.id, { isLive: false });

    const notificationTargets: Array<{ channel: string; address: string }> = [
      { channel: 'system', address: monitor.project.name },
    ];

    for (const channel of alertPolicy?.notificationChannels ?? []) {
      notificationTargets.push({
        channel: channel.channelType,
        address: channel.address,
      });
    }

    for (const target of notificationTargets) {
      const message = this.buildIncidentTriggeredMessage(
        monitor,
        reason,
        incident.id,
        target.channel,
        target.address,
      );
      this.kafkaClient.emit(Topics.INCIDENTS_TRIGGERED_NOTIFICATIONS, message);
    }
  }

  /**
   * Resolve Incident
   * @param incident Incident (libs/database)
   */
  private async resolveIncident(incident: Incident) {
    incident.status = IncidentStatus.RESOLVED;
    incident.resolvedAt = new Date();

    await this.incidentRepo.save(incident);

    this.kafkaClient.emit(Topics.INCIDENTS_RESOLVED, {
      incidentId: incident.id,
      resolvedAt: incident.resolvedAt,
    });
  }
}
