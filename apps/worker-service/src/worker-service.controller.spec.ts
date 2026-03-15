import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { WorkerController } from './worker-service.controller';
import { CheckExecutorService } from './checkExecutor.service';
import { CheckExecutionEventProducerService } from './KafkaProducer.service';
import { HttpMethods } from '@app/kafka-topics/enums/HttpMethods';
import { KafkaContext } from '@nestjs/microservices';
import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals';

describe('WorkerController', () => {
  let app: INestApplication;
  let controller: WorkerController;
  let checkExecutorService: CheckExecutorService;
  let eventProducerService: CheckExecutionEventProducerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkerController],
      providers: [
        {
          provide: CheckExecutorService,
          useValue: {
            collectHttpTimingMetrics: jest.fn(),
          },
        },
        {
          provide: CheckExecutionEventProducerService,
          useValue: {
            CheckCompleted: jest.fn(),
            CheckFailed: jest.fn(),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        stopAtFirstError: true,
        disableErrorMessages: true,
        exceptionFactory: () => null,
      }),
    );
    await app.init();

    controller = app.get<WorkerController>(WorkerController);
    checkExecutorService =
      app.get<CheckExecutorService>(CheckExecutorService);
    eventProducerService = app.get<CheckExecutionEventProducerService>(
      CheckExecutionEventProducerService,
    );
  });

  afterEach(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleMonitoringData', () => {
    const validPayload = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      checkId: '123e4567-e89b-12d3-a456-426614174001',
      url: 'https://example.com',
      method: HttpMethods.GET,
      timeout: 5000,
      enqueuedAt: new Date().toISOString(),
      headers: {
        Authorization: 'Bearer test-token',
      },
      body: '{"ping":"pong"}',
    };

    const mockContext = {} as KafkaContext;

    it('should skip processing for invalid url', async () => {
      const invalidPayload = { ...validPayload, url: 'not-a-url' };
      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      await controller.handleMonitoringData(invalidPayload, mockContext);

      expect(loggerErrorSpy).toHaveBeenCalled();
      expect(
        checkExecutorService.collectHttpTimingMetrics,
      ).not.toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
    });

    it('should skip processing for invalid method enum', async () => {
      const invalidPayload = { ...validPayload, method: 'TRACE' };
      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      await controller.handleMonitoringData(invalidPayload, mockContext);

      expect(loggerErrorSpy).toHaveBeenCalled();
      expect(
        checkExecutorService.collectHttpTimingMetrics,
      ).not.toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
    });

    it('should skip processing for non-positive timeout', async () => {
      const invalidPayload = { ...validPayload, timeout: 0 };
      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      await controller.handleMonitoringData(invalidPayload, mockContext);

      expect(loggerErrorSpy).toHaveBeenCalled();
      expect(
        checkExecutorService.collectHttpTimingMetrics,
      ).not.toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
    });

    it('should skip processing for invalid enqueuedAt date string', async () => {
      const invalidPayload = { ...validPayload, enqueuedAt: 'yesterday' };
      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      await controller.handleMonitoringData(invalidPayload, mockContext);

      expect(loggerErrorSpy).toHaveBeenCalled();
      expect(
        checkExecutorService.collectHttpTimingMetrics,
      ).not.toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
    });

    it('should skip processing when headers is not an object', async () => {
      const invalidPayload = {
        ...validPayload,
        headers: 'authorization: bearer token',
      };
      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      await controller.handleMonitoringData(invalidPayload, mockContext);

      expect(loggerErrorSpy).toHaveBeenCalled();
      expect(
        checkExecutorService.collectHttpTimingMetrics,
      ).not.toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
    });

    it('should call CheckCompleted when processing succeeds', async () => {
      const metrics = { status_code: 200, ttfb: 100 };
      (
        checkExecutorService.collectHttpTimingMetrics as jest.Mock<any>
      ).mockResolvedValue({
        success: true,
        metrics: metrics,
      });

      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      await controller.handleMonitoringData(validPayload, mockContext);

      expect(
        checkExecutorService.collectHttpTimingMetrics,
      ).toHaveBeenCalledWith(validPayload.url, {
        method: validPayload.method,
        timeout: validPayload.timeout,
        headers: validPayload.headers,
        body: validPayload.body,
      });
      expect(eventProducerService.CheckCompleted).toHaveBeenCalledWith({
        Request: expect.objectContaining(validPayload),
        Response: metrics,
        region: process.env.REGION || 'IN',
      });
      expect(eventProducerService.CheckFailed).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should process when optional headers and body are omitted', async () => {
      const payloadWithoutOptionalFields = {
        ...validPayload,
        headers: undefined,
        body: undefined,
      };
      const metrics = { status_code: 204, ttfb: 65 };
      (
        checkExecutorService.collectHttpTimingMetrics as jest.Mock<any>
      ).mockResolvedValue({
        success: true,
        metrics: metrics,
      });

      await controller.handleMonitoringData(
        payloadWithoutOptionalFields,
        mockContext,
      );

      expect(
        checkExecutorService.collectHttpTimingMetrics,
      ).toHaveBeenCalledWith(payloadWithoutOptionalFields.url, {
        method: payloadWithoutOptionalFields.method,
        timeout: payloadWithoutOptionalFields.timeout,
        headers: payloadWithoutOptionalFields.headers,
        body: payloadWithoutOptionalFields.body,
      });
      expect(eventProducerService.CheckCompleted).toHaveBeenCalledWith({
        Request: expect.objectContaining(payloadWithoutOptionalFields),
        Response: metrics,
        region: process.env.REGION || 'IN',
      });
    });

    it('should skip processing when non-whitelisted field is present', async () => {
      const invalidPayload = {
        ...validPayload,
        unknownField: 'not-allowed',
      };
      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      await controller.handleMonitoringData(invalidPayload, mockContext);

      expect(loggerErrorSpy).toHaveBeenCalled();
      expect(
        checkExecutorService.collectHttpTimingMetrics,
      ).not.toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
    });

    it('should call CheckFailed when processing fails', async () => {
      const error = { error_message: 'Timeout' };
      (
        checkExecutorService.collectHttpTimingMetrics as jest.Mock<any>
      ).mockResolvedValue({
        success: false,
        error: error,
      });

      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      await controller.handleMonitoringData(validPayload, mockContext);

      expect(
        checkExecutorService.collectHttpTimingMetrics,
      ).toHaveBeenCalledWith(validPayload.url, {
        method: validPayload.method,
        timeout: validPayload.timeout,
        headers: validPayload.headers,
        body: validPayload.body,
      });
      expect(eventProducerService.CheckFailed).toHaveBeenCalledWith({
        Request: expect.objectContaining(validPayload),
        Response: error,
        region: process.env.REGION || 'IN',
      });
      expect(eventProducerService.CheckCompleted).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle unexpected executor errors gracefully', async () => {
      (
        checkExecutorService.collectHttpTimingMetrics as jest.Mock<any>
      ).mockRejectedValue(new Error('Unexpected'));
      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      await controller.handleMonitoringData(validPayload, mockContext);

      expect(loggerErrorSpy).toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
    });
  });
});
