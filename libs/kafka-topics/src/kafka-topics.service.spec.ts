import { Test, TestingModule } from '@nestjs/testing';
import { KafkaTopicsService } from './kafka-topics.service';

describe('KafkaTopicsService', () => {
  let service: KafkaTopicsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KafkaTopicsService],
    }).compile();

    service = module.get<KafkaTopicsService>(KafkaTopicsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
