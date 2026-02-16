import { Test, TestingModule } from '@nestjs/testing';
import { KafkaProducerService } from './KafkaProducer.service';
import { ClientKafka } from '@nestjs/microservices';
import { CheckExecutionRequestedEvent, Topics, HttpMethod } from '@app/kafka-topics';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { of} from 'rxjs';

describe('KafkaProducerService', () => {
  let service: KafkaProducerService;
  let kafkaClient: jest.Mocked<ClientKafka>;

  const mockKafkaClient = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KafkaProducerService,
        {
          provide: 'KAFKA_PRODUCER',
          useValue: mockKafkaClient,
        },
      ],
    }).compile();

    service = module.get<KafkaProducerService>(KafkaProducerService);
    kafkaClient = module.get('KAFKA_PRODUCER') as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('emitCheckExecutionRequested', () => {
    const mockEvent: CheckExecutionRequestedEvent = {
      id: 'uuid-1',
      checkId: 'monitor-1',
      url: 'http://example.com',
      method: HttpMethod('GET'),
      timeout: 5000,
      enqueuedAt: new Date().toISOString(),
      headers: {},
      body: '',
    };

    it('should emit event and return true on success', async () => {
      mockKafkaClient.emit.mockReturnValue(of({}));

      const result = await service.emitCheckExecutionRequested(mockEvent);

      expect(kafkaClient.emit).toHaveBeenCalledWith(
        Topics.CHECK_EXECUTION_REQUESTED,
        mockEvent,
      );
      expect(result).toBe(true);
    });

    it('should return false and log error when emit fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const error = new Error('Kafka emit failed');
        mockKafkaClient.emit.mockImplementation(() => {
            throw error;
        });

        const result = await service.emitCheckExecutionRequested(mockEvent);

        expect(consoleSpy).toHaveBeenCalledWith('Error emitting Kafka event:', error);
        expect(result).toBe(false);
    });
  });
});
