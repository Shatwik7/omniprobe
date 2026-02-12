import { Test, TestingModule } from '@nestjs/testing';
import { CheckExecutionEventProducerService } from './KafkaProducer.service';
import { ClientKafka } from '@nestjs/microservices';
import { CheckExecutionCompletedEvent, CheckExecutionFailedEvent, Topics } from '@app/kafka-topics';
import { of } from 'rxjs';
import { expect, jest, describe, it, beforeEach } from '@jest/globals';

describe('CheckExecutionEventProducerService', () => {
  let service: CheckExecutionEventProducerService;
  let kafkaClient: ClientKafka;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckExecutionEventProducerService,
        {
          provide: 'KAFKA_PRODUCER',
          useValue: {
            connect: jest.fn(),
            close: jest.fn(),
            emit: jest.fn(() => of({})),
          },
        },
      ],
    }).compile();

    service = module.get<CheckExecutionEventProducerService>(CheckExecutionEventProducerService);
    kafkaClient = module.get<ClientKafka>('KAFKA_PRODUCER');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to kafka', async () => {
      await service.onModuleInit();
      expect(kafkaClient.connect).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should close kafka connection', async () => {
      await service.onModuleDestroy();
      expect(kafkaClient.close).toHaveBeenCalled();
    });
  });

  describe('CheckFailed', () => {
    it('should emit CHECK_EXECUTION_FAILED event', () => {
      const data = {
        Request: { id: 'test-id' },
        Response: { error_message: 'failed' },
      } as unknown as CheckExecutionFailedEvent;

      service.CheckFailed(data);

      expect(kafkaClient.emit).toHaveBeenCalledWith(Topics.CHECK_EXECUTION_FAILED, data);
    });
  });

  describe('CheckCompleted', () => {
    it('should emit CHECK_EXECUTION_COMPLETED event', () => {
      const data = {
        Request: { id: 'test-id' },
        Response: { status_code: 200 },
      } as unknown as CheckExecutionCompletedEvent;

      service.CheckCompleted(data);

      expect(kafkaClient.emit).toHaveBeenCalledWith(Topics.CHECK_EXECUTION_COMPLETED, data);
    });
  });
});