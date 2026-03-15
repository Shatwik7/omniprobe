import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientKafka } from '@nestjs/microservices';
import { IngestServiceService } from './ingest-service.service';
import { Monitor, Metric, Incident, AlertPolicy } from '@app/database';
import { IncidentStatus } from '@app/database/entity/incident.entity';
import {
  Topics,
  CheckExecutionCompletedEvent,
  CheckExecutionFailedEvent,
} from '@app/kafka-topics';
import { HttpMethods } from '@app/kafka-topics/enums/HttpMethods';
import { HttpErrorType } from '@app/kafka-topics/enums/HttpError';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('IngestServiceService', () => {
  let service: IngestServiceService;
  let monitorRepo: jest.Mocked<Repository<Monitor>>;
  let metricRepo: jest.Mocked<Repository<Metric>>;
  let incidentRepo: jest.Mocked<Repository<Incident>>;
  let kafkaClient: jest.Mocked<ClientKafka>;

  const mockMonitor = {
    id: 'monitor-id',
    name: 'monitor-name',
    isActive: true,
    isLive: true,
    expectedStatus: 200,
    project: {
      id: 'project-id',
      name: 'project-name',
    },
    alertPolicy: undefined,
  } as Monitor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestServiceService,
        {
          provide: getRepositoryToken(Monitor),
          useValue: { findOne: jest.fn(), update: jest.fn() },
        },
        {
          provide: getRepositoryToken(Metric),
          useValue: { create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Incident),
          useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(AlertPolicy),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: 'KAFKA_PRODUCER',
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<IngestServiceService>(IngestServiceService);

    monitorRepo = module.get(getRepositoryToken(Monitor));
    metricRepo = module.get(getRepositoryToken(Metric));
    incidentRepo = module.get(getRepositoryToken(Incident));
    kafkaClient = module.get('KAFKA_PRODUCER');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleCheckCompletion', () => {
    const completionEvent: CheckExecutionCompletedEvent = {
      Request: {
        id: 'req-id',
        checkId: 'monitor-id',
        url: 'http://test.com',
        method: HttpMethods.GET,
        timeout: 5000,
        enqueuedAt: new Date().toISOString(),
      },
      Response: {
        status_code: 200,
        tcp_beginning_start: 100,
        tcp_end: 200,
        tls_start: 300,
        tls_end: 400,
        ttfb: 500,
        tdt: 600,
        dns_lookup_end: 700,
        server_processing_time: 50,
      },
      region: 'IN',
    };

    it('should do nothing if monitor is not found', async () => {
      monitorRepo.findOne.mockResolvedValue(null);
      await service.handleCheckCompletion(completionEvent);
      expect(metricRepo.save).not.toHaveBeenCalled();
      expect(incidentRepo.save).not.toHaveBeenCalled();
    });

    it('should store a success metric and not create an incident for a valid response', async () => {
      monitorRepo.findOne.mockResolvedValue(mockMonitor);
      incidentRepo.findOne.mockResolvedValue(null);
      metricRepo.create.mockReturnValue({} as Metric);

      await service.handleCheckCompletion(completionEvent);

      expect(monitorRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'monitor-id', isActive: true, isLive: true },
        relations: ['alertPolicy'],
      });
      expect(metricRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isSuccess: true, statusCode: 200 }),
      );
      expect(metricRepo.save).toHaveBeenCalledTimes(1);
      expect(incidentRepo.findOne).toHaveBeenCalledWith({
        where: { monitor: { id: 'monitor-id' }, status: IncidentStatus.OPEN },
      });
      expect(incidentRepo.create).not.toHaveBeenCalled();
    });

    it('should create an incident for an invalid response if no open incident exists', async () => {
      const badResponseEvent = {
        ...completionEvent,
        Response: { ...completionEvent.Response, status_code: 500 },
      };
      monitorRepo.findOne.mockResolvedValue(mockMonitor);
      incidentRepo.findOne.mockResolvedValue(null);
      metricRepo.create.mockReturnValue({} as Metric);
      incidentRepo.create.mockReturnValue({ id: 'incident-id' } as Incident);

      await service.handleCheckCompletion(badResponseEvent);

      expect(metricRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isSuccess: false, statusCode: 500 }),
      );
      expect(metricRepo.save).toHaveBeenCalledTimes(1);
      expect(incidentRepo.create).toHaveBeenCalledWith({
        monitor: mockMonitor,
        status: IncidentStatus.OPEN,
        summary: 'null',
        severity: 'CRITICAL',
      });
      expect(incidentRepo.save).toHaveBeenCalledTimes(1);
      expect(kafkaClient.emit).toHaveBeenCalledWith(
        Topics.INCIDENTS_TRIGGERED_NOTIFICATIONS,
        expect.any(Object),
      );
    });

    it('should not create a new incident if one is already open for an invalid response', async () => {
      const badResponseEvent = {
        ...completionEvent,
        Response: { ...completionEvent.Response, status_code: 500 },
      };
      const openIncident = { id: 'open-incident' } as Incident;
      monitorRepo.findOne.mockResolvedValue(mockMonitor);
      incidentRepo.findOne.mockResolvedValue(openIncident);
      metricRepo.create.mockReturnValue({} as Metric);

      await service.handleCheckCompletion(badResponseEvent);

      expect(metricRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isSuccess: false, statusCode: 500 }),
      );
      expect(metricRepo.save).toHaveBeenCalledTimes(1);
      expect(incidentRepo.create).not.toHaveBeenCalled();
      expect(incidentRepo.save).not.toHaveBeenCalled();
    });

    it('should resolve an open incident if response becomes valid', async () => {
      const openIncident = {
        id: 'incident-id',
        status: IncidentStatus.OPEN,
      } as Incident;
      monitorRepo.findOne.mockResolvedValue(mockMonitor);
      incidentRepo.findOne.mockResolvedValue(openIncident);
      metricRepo.create.mockReturnValue({} as Metric);

      await service.handleCheckCompletion(completionEvent);

      expect(metricRepo.save).toHaveBeenCalledTimes(1);
      expect(incidentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'incident-id',
          status: IncidentStatus.RESOLVED,
          resolvedAt: expect.any(Date),
        }),
      );
      expect(kafkaClient.emit).toHaveBeenCalledWith(
        Topics.INCIDENTS_RESOLVED,
        expect.any(Object),
      );
    });
  });

  describe('handleCheckFailure', () => {
    const failureEvent: CheckExecutionFailedEvent = {
      Request: {
        id: 'req-id',
        checkId: 'monitor-id',
        url: 'http://test.com',
        method: HttpMethods.GET,
        timeout: 5000,
        enqueuedAt: new Date().toISOString(),
      },
      Response: {
        error_type: HttpErrorType.TIMEOUT_ERROR,
        error_message: 'Request timed out',
        timestamp: Date.now(),
        url: 'http://test.com',
      },
      region: 'IN',
    };

    it('should do nothing if monitor is not found', async () => {
      monitorRepo.findOne.mockResolvedValue(null);
      await service.handleCheckFailure(failureEvent);
      expect(metricRepo.save).not.toHaveBeenCalled();
      expect(incidentRepo.save).not.toHaveBeenCalled();
    });

    it('should store a failure metric and create an incident if none is open', async () => {
      monitorRepo.findOne.mockResolvedValue(mockMonitor);
      incidentRepo.findOne.mockResolvedValue(null);
      metricRepo.create.mockReturnValue({} as Metric);
      incidentRepo.create.mockReturnValue({ id: 'incident-id' } as Incident);

      await service.handleCheckFailure(failureEvent);

      expect(metricRepo.create).toHaveBeenCalledWith({
        monitor: mockMonitor,
        isSuccess: false,
        region: 'IN',
      });
      expect(metricRepo.save).toHaveBeenCalledTimes(1);
      expect(incidentRepo.create).toHaveBeenCalledWith({
        monitor: mockMonitor,
        status: IncidentStatus.OPEN,
        summary: JSON.stringify(failureEvent.Response),
        severity: 'CRITICAL',
      });
      expect(incidentRepo.save).toHaveBeenCalledTimes(1);
      expect(kafkaClient.emit).toHaveBeenCalledWith(
        Topics.INCIDENTS_TRIGGERED_NOTIFICATIONS,
        expect.any(Object),
      );
    });

    it('should not create a new incident if one is already open', async () => {
      const openIncident = { id: 'open-incident' } as Incident;
      monitorRepo.findOne.mockResolvedValue(mockMonitor);
      incidentRepo.findOne.mockResolvedValue(openIncident);
      metricRepo.create.mockReturnValue({} as Metric);

      await service.handleCheckFailure(failureEvent);

      expect(metricRepo.save).toHaveBeenCalledTimes(1);
      expect(incidentRepo.create).not.toHaveBeenCalled();
      expect(incidentRepo.save).not.toHaveBeenCalled();
      expect(kafkaClient.emit).not.toHaveBeenCalled();
    });
  });
});
