import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientKafka } from '@nestjs/microservices';

import { Monitor, Metric, Incident, AlertPolicy } from '@app/database';
import { IncidentStatus } from '@app/database/entity/incident.entity';

import {
  CheckExecutionCompletedEvent,
  CheckExecutionFailedEvent,
  Topics,
} from '@app/kafka-topics';

@Injectable()
export class IngestServiceService {
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
  ) {}

  /**
   * COMPLETION EVENT
   * @param event CheckExecutionCompltedEvent (libs/kafka-topic)
   * @returns 
   */
  async handleCheckCompletion(event: CheckExecutionCompletedEvent) {

    const monitor = await this.monitorRepo.findOne({
      where: { id: event.Request.checkId, isActive: true, isLive: true },
      relations: ['alertPolicy'],
    });

    if (!monitor) return;

    const success = this.isResponseValid(monitor, event);

    await this.storeSuccessMetric(monitor, event, success);

    const openIncident = await this.getOpenIncident(monitor.id);

    if (!success) {
      if (!openIncident) {
        await this.createIncident(monitor, 'BAD_RESPONSE');
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
      relations: ['alertPolicy'],
    });

    if (!monitor) return;

    await this.storeFailureMetric(monitor);

    const openIncident = await this.getOpenIncident(monitor.id);

    if (!openIncident) {
      await this.createIncident(monitor, event.Response.error_type);
    }
  }

  /**
   * VALIDATION LOGIC
   * @param monitor Monitor (libs/database)
   * @param event CheckExecutionCompletedEvent (libs/kafka-topic)
   * @returns 
   */
  private isResponseValid(monitor: Monitor, event: CheckExecutionCompletedEvent) {
    if (monitor.expectedStatus && event.Response.status_code !== monitor.expectedStatus)
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
    const metric = this.metricRepo.create({
      monitor,
      isSuccess: success,
      statusCode: event.Response.status_code,
      total_time_ms: event.Response.tdt,
      dns_response_time_ms: event.Response.dns_lookup_end,
      tcp_connection_time_ms: event.Response.tcp_end,
      server_processing_time_ms:event.Response.server_processing_time,
      tls_handshake_time_ms: event.Response.tls_end,
      time_to_first_byte_ms: event.Response.ttfb,
      content_transfer_time_ms: event.Response.server_processing_time,
      region: event.region,
    });

    await this.metricRepo.save(metric);
  }

  /**
   * FAILURE METRIC STORAGE
   * @param monitor Monitor (libs/database)
   */
  private async storeFailureMetric(monitor: Monitor) {
    const metric = this.metricRepo.create({
      monitor,
      isSuccess: false,
      region: 'IN',
    });

    await this.metricRepo.save(metric);
  }


  /**
   * Get Open Incident
   * @param monitorId : UUID 
   * @returns 
   */
  private getOpenIncident(monitorId: string) {
    return this.incidentRepo.findOne({
      where: { monitor: { id: monitorId }, status: IncidentStatus.OPEN },
    });
  }


  /**
   * Create New Incident
   * @param monitor Monitor (libs/database)
   * @param reason 
   */
  private async createIncident(monitor: Monitor, reason: string) {
    const incident = this.incidentRepo.create({
      monitor,
      status: IncidentStatus.OPEN,
      summary: reason,
    });

    await this.incidentRepo.save(incident);

    this.kafkaClient.emit(Topics.INCIDENTS_CREATED, {
      incidentId: incident.id,
      monitorId: monitor.id,
      reason,
      createdAt: new Date(),
    });
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