import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { WorkerController } from './worker-service.controller';
import { CheckExecutorService } from './checkExecutor.service';
import { CheckExecutionEventProducerService } from './KafkaProducer.service';
import { CheckExecutionRequestedEvent } from '@app/kafka-topics';
import { HttpMethods } from '@app/kafka-topics/enums/HttpMethods';
import { KafkaContext } from '@nestjs/microservices';
import { expect, jest, describe, it, beforeEach } from '@jest/globals';

describe('WorkerController', () => {
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

    controller = module.get<WorkerController>(WorkerController);
    checkExecutorService =
      module.get<CheckExecutorService>(CheckExecutorService);
    eventProducerService = module.get<CheckExecutionEventProducerService>(
      CheckExecutionEventProducerService,
    );
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
    };

    const mockContext = {} as KafkaContext;

    it('should skip processing if validation fails', async () => {
      const invalidPayload = { url: 'not-a-url' };
      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      await controller.handleMonitoringData(invalidPayload, mockContext);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid message'),
      );
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
      ).toHaveBeenCalledWith(validPayload.url);
      expect(eventProducerService.CheckCompleted).toHaveBeenCalledWith({
        Request: expect.objectContaining(validPayload),
        Response: metrics,
        region: process.env.REGION || 'IN',
      });
      expect(eventProducerService.CheckFailed).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
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
      ).toHaveBeenCalledWith(validPayload.url);
      expect(eventProducerService.CheckFailed).toHaveBeenCalledWith({
        Request: expect.objectContaining(validPayload),
        Response: error,
        region: process.env.REGION || 'IN',
      });
      expect(eventProducerService.CheckCompleted).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle unexpected errors gracefully', async () => {
      (
        checkExecutorService.collectHttpTimingMetrics as jest.Mock<any>
      ).mockRejectedValue(new Error('Unexpected'));
      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      await controller.handleMonitoringData(validPayload, mockContext);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Unexpected error:',
        expect.any(Error),
      );

      loggerErrorSpy.mockRestore();
    });
  });
});
