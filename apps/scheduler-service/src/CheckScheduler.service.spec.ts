import { Test, TestingModule } from '@nestjs/testing';
import { CheckSchedulerService } from './CheckScheduler.service';
import { KafkaProducerService } from './KafkaProducer.service';
import { PriorityQueue } from './PriorityQueue.service';
import { CacheService } from './Cache.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Monitor } from '@app/database';
import { Repository } from 'typeorm';
import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
  afterEach,
  beforeAll,
} from '@jest/globals';

type MockType<T> = {
  [P in keyof T]?: jest.Mock<any>;
};

describe('CheckSchedulerService', () => {
  let service: CheckSchedulerService;
  let kafkaProducerService: MockType<KafkaProducerService>;
  let priorityQueue: MockType<PriorityQueue>;
  let cacheService: MockType<CacheService>;
  let monitorRepository: MockType<Repository<Monitor>>;

  const mockKafkaProducerService: MockType<KafkaProducerService> = {
    emitCheckExecutionRequested: jest.fn(),
  };

  const mockPriorityQueue: MockType<PriorityQueue> = {
    checkDataExists: jest.fn(),
    addItem: jest.fn(),
    getDueItems: jest.fn(),
    removeItem: jest.fn(),
  };

  const mockCacheService: MockType<CacheService> = {
    tryAcquireBootstrapLock: jest.fn(),
    tryReleaseBootstrapLock: jest.fn(),
    getMonitor: jest.fn(),
    setMonitor: jest.fn(),
  };

  const mockMonitorRepository: MockType<Repository<Monitor>> = {
    count: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeAll(() => {
    Object.defineProperty(global, 'crypto', {
      value: {
        randomUUID: () => 'test-uuid-1234',
      },
    });
  });

  beforeEach(async () => {
    // 1. Setup Fake Timers for deterministic Date.now()
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckSchedulerService,
        { provide: KafkaProducerService, useValue: mockKafkaProducerService },
        { provide: PriorityQueue, useValue: mockPriorityQueue },
        { provide: CacheService, useValue: mockCacheService },
        {
          provide: getRepositoryToken(Monitor),
          useValue: mockMonitorRepository,
        },
      ],
    }).compile();

    service = module.get<CheckSchedulerService>(CheckSchedulerService);
    kafkaProducerService = module.get(KafkaProducerService);
    priorityQueue = module.get(PriorityQueue);
    cacheService = module.get(CacheService);
    monitorRepository = module.get(getRepositoryToken(Monitor));

    // 2. IMPORTANT: Mock sleep to resolve immediately
    // This bypasses the deadlock caused by await sleep() + fakeTimers
    jest
      .spyOn(service as any, 'sleep')
      .mockImplementation(() => Promise.resolve());

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize priority queue if it does not exist and lock is acquired', async () => {
      mockPriorityQueue.checkDataExists!.mockResolvedValue(false);
      mockCacheService.tryAcquireBootstrapLock!.mockResolvedValue(true);
      mockMonitorRepository.count!.mockResolvedValue(1);

      const monitor = { id: '1', isActive: true, frequencySeconds: 60 };
      mockMonitorRepository.find!.mockResolvedValue([monitor]);

      await service.onModuleInit();

      expect(mockPriorityQueue.checkDataExists).toHaveBeenCalled();
      expect(mockCacheService.tryAcquireBootstrapLock).toHaveBeenCalledWith(0);
      expect(mockMonitorRepository.count).toHaveBeenCalled();

      const expectedNextRun =
        new Date('2024-01-01T00:00:00Z').getTime() + 60000;
      expect(mockPriorityQueue.addItem).toHaveBeenCalledWith(
        'monitors',
        expectedNextRun,
        monitor.id,
      );
      expect(mockCacheService.tryReleaseBootstrapLock).toHaveBeenCalledWith(0);
    });

    it('should wait for another instance if lock is not acquired', async () => {
      // Arrange
      mockPriorityQueue
        .checkDataExists!.mockResolvedValueOnce(false) // 1. Initial check (needs init)
        .mockResolvedValueOnce(true) // 2. Loop check (another instance working...)
        .mockResolvedValueOnce(false); // 3. Loop check (done!)

      mockCacheService.tryAcquireBootstrapLock!.mockResolvedValue(false); // Lock taken by someone else

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockCacheService.tryAcquireBootstrapLock).toHaveBeenCalledWith(0);
      expect(mockMonitorRepository.count).not.toHaveBeenCalled();
      // Verify that sleep was called (since we were waiting in the loop)
      expect((service as any).sleep).toHaveBeenCalledWith(10000);
    });

    it('should do nothing if priority queue already exists', async () => {
      mockPriorityQueue.checkDataExists!.mockResolvedValue(true);

      await service.onModuleInit();

      expect(mockPriorityQueue.checkDataExists).toHaveBeenCalled();
      expect(mockCacheService.tryAcquireBootstrapLock).not.toHaveBeenCalled();
    });
  });

  describe('processDueMonitors', () => {
    it('should process due monitors, emit Kafka events, and reschedule them', async () => {
      const monitorId = '1';
      const monitor = {
        id: monitorId,
        target: 'http://test.com',
        frequencySeconds: 60,
        method: 'GET',
        headers: {},
        body: '',
      };

      mockPriorityQueue.getDueItems!.mockResolvedValue([monitorId]);
      mockCacheService.getMonitor!.mockResolvedValue(monitor);
      mockKafkaProducerService.emitCheckExecutionRequested!.mockResolvedValue(
        true,
      );

      await (service as any).processDueMonitors();

      expect(priorityQueue.getDueItems).toHaveBeenCalledWith(100);
      expect(priorityQueue.removeItem).toHaveBeenCalledWith(
        'monitors',
        monitorId,
      );
      expect(
        kafkaProducerService.emitCheckExecutionRequested,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          checkId: monitorId,
        }),
      );

      const expectedNextRun =
        new Date('2024-01-01T00:00:00Z').getTime() + 60000;
      expect(priorityQueue.addItem).toHaveBeenCalledWith(
        'monitors',
        expectedNextRun,
        monitorId,
      );
    });

    it('should handle empty due items gracefully', async () => {
      mockPriorityQueue.getDueItems!.mockResolvedValue([]);

      await (service as any).processDueMonitors();

      expect(priorityQueue.getDueItems).toHaveBeenCalledWith(100);
      expect(priorityQueue.removeItem).not.toHaveBeenCalled();

      // Verify sleep was called to prevent cpu spinning
      expect((service as any).sleep).toHaveBeenCalledWith(500);
    });
  });

  describe('getMonitor', () => {
    it('should get monitor from cache', async () => {
      const monitorId = '1';
      const monitor = { id: monitorId, target: 'http://test.com' };
      mockCacheService.getMonitor!.mockResolvedValue(monitor);

      const result = await (service as any).getMonitor(monitorId);

      expect(cacheService.getMonitor).toHaveBeenCalledWith(monitorId);
      expect(result).toEqual(monitor);
    });

    it('should get monitor from repository if not in cache', async () => {
      const monitorId = '1';
      const monitor = { id: monitorId, target: 'http://test.com' };

      mockCacheService.getMonitor!.mockResolvedValue(null);
      mockMonitorRepository.findOne!.mockResolvedValue(monitor);

      const result = await (service as any).getMonitor(monitorId);

      expect(cacheService.getMonitor).toHaveBeenCalledWith(monitorId);
      expect(monitorRepository.findOne).toHaveBeenCalledWith({
        where: { id: monitorId },
      });
      expect(cacheService.setMonitor).toHaveBeenCalledWith(monitor);
      expect(result).toEqual(monitor);
    });

    it('should throw an error if monitor not found', async () => {
      const monitorId = '1';
      mockCacheService.getMonitor!.mockResolvedValue(null);
      mockMonitorRepository.findOne!.mockResolvedValue(null);

      await expect((service as any).getMonitor(monitorId)).rejects.toThrow(
        `Monitor with ID ${monitorId} not found in database`,
      );
    });
  });
});
