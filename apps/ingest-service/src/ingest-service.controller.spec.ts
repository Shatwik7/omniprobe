import { Test, TestingModule } from '@nestjs/testing';
import { IngestServiceController } from './ingest-service.controller';
import { IngestServiceService } from './ingest-service.service';
import { HttpMethods } from '@app/kafka-topics/enums/HttpMethods';
import { HttpErrorType } from '@app/kafka-topics';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import 'reflect-metadata';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('IngestServiceController', () => {
  let controller: IngestServiceController;
  let service: jest.Mocked<IngestServiceService>;

  const mockIngestService = {
    handleCheckCompletion: jest.fn(),
    handleCheckFailure: jest.fn(),
  };

  const mockKafkaClient = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IngestServiceController],
      providers: [
        { provide: IngestServiceService, useValue: mockIngestService },
        { provide: 'KAFKA_PRODUCER', useValue: mockKafkaClient },
      ],
    }).compile();

    controller = module.get(IngestServiceController);
    service = module.get(IngestServiceService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  /**
   * COMPLETION EVENT TESTS
   */
  describe('handleCheckExecutionCompleted', () => {
    it('should call the service to handle check completion', async () => {
      const event = {
        Request: {
          id: VALID_UUID,
          checkId: VALID_UUID,
          url: 'http://example.com',
          method: HttpMethods.GET,
          timeout: 1000,
          enqueuedAt: new Date().toISOString(),
        },
        Response: {
          dns_lookup_end: 1,
          tcp_beginning_start: 1,
          tcp_end: 1,
          tls_start: 1,
          tls_end: 1,
          ttfb: 1,
          tdt: 100,
          server_processing_time: 1,
          status_code: 200,
        },
        region: 'IN',
      };

      await controller.handleCheckExecutionCompleted(event);

      expect(service.handleCheckCompletion).toHaveBeenCalledTimes(1);

      const arg = service.handleCheckCompletion.mock.calls[0][0];

      expect(arg.Request.id).toBe(VALID_UUID);
      expect(arg.Request.checkId).toBe(VALID_UUID);
      expect(arg.Response.status_code).toBe(200);
    });

    it('should not call the service if the message is invalid', async () => {
      const event = {
        Request: {
          id: 'not-a-uuid',
          checkId: 'not-a-uuid',
          url: 'http://example.com',
          method: HttpMethods.GET,
          timeout: 1000,
          enqueuedAt: new Date().toISOString(),
        },
        Response: {
          dns_lookup_end: 1,
          tcp_beginning_start: 1,
          tcp_end: 1,
          tls_start: 1,
          tls_end: 1,
          ttfb: 1,
          tdt: 100,
          server_processing_time: 1,
          status_code: 200,
        },
        region: 'IN',
      };

      await controller.handleCheckExecutionCompleted(event);

      expect(service.handleCheckCompletion).not.toHaveBeenCalled();
    });
  });

  /**
   * Failure Test Cases
   */
  describe('handleCheckExecutionFailed', () => {
    it('should call the service to handle check failure', async () => {
      const event = {
        Request: {
          id: VALID_UUID,
          checkId: VALID_UUID,
          url: 'http://example.com',
          method: HttpMethods.GET,
          timeout: 1000,
          enqueuedAt: new Date().toISOString(),
        },
        Response: {
          error_type: HttpErrorType.UNKNOWN_ERROR,
          error_message: 'Error',
          timestamp: Date.now(),
          url: 'http://example.com',
        },
        region: 'IN',
      };

      await controller.handleCheckExecutionFailed(event);

      expect(service.handleCheckFailure).toHaveBeenCalledTimes(1);

      const arg = service.handleCheckFailure.mock.calls[0][0];

      expect(arg.Request.id).toBe(VALID_UUID);
      expect(arg.Response.error_type).toBe(HttpErrorType.UNKNOWN_ERROR);
    });

    it('should not call the service if the message is invalid', async () => {
      const event = {
        Request: {
          id: 'bad-id',
          checkId: VALID_UUID,
          url: 'http://example.com',
          method: HttpMethods.GET,
          timeout: 1000,
          enqueuedAt: new Date().toISOString(),
        },
        Response: {
          error_type: HttpErrorType.UNKNOWN_ERROR,
          error_message: 'Error',
          timestamp: Date.now(),
          url: 'http://example.com',
        },
        region: 'IN',
      };

      await controller.handleCheckExecutionFailed(event);

      expect(service.handleCheckFailure).not.toHaveBeenCalled();
    });
  });
});
