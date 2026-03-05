import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { LongPollingService, LongPollingOptions } from './long-polling.service';
import { LONG_POLLING_OPTIONS } from './long-polling.constant';
import {jest, describe, it, expect, beforeEach, afterEach} from '@jest/globals';

jest.mock('ioredis', () => {
  const MockRedis = require('ioredis-mock');
  return {
    __esModule: true,
    default: MockRedis,
  };
});

jest.useFakeTimers();

describe('LongPollingService', () => {
  let service: LongPollingService;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    const options: LongPollingOptions = {
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        LongPollingService,
        {
          provide: LONG_POLLING_OPTIONS,
          useValue: options,
        },
      ],
    }).compile();

    service = moduleRef.get<LongPollingService>(LongPollingService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    await moduleRef.close();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('waitForUpdates', () => {
    
    it('should resolve with null after a timeout', async () => {
      const monitorId = 'test-monitor-timeout';
      const promise = service.waitForUpdates(monitorId);

      jest.advanceTimersByTime(30000);

      await expect(promise).resolves.toBeNull();
    });
  });

  describe('publishUpdate', () => {
    it('should publish an update to the correct channel', async () => {
      const monitorId = 'test-monitor-publish';
      const data = { key: 'publish-value' };
      const publishSpy = jest.spyOn(service['pubClient'], 'publish');

      await service.publishUpdate(monitorId, data);

      expect(publishSpy).toHaveBeenCalledWith(
        `updates:monitor:${monitorId}`,
        JSON.stringify(data),
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit the pub and sub clients', async () => {
      const pubQuitSpy = jest.spyOn(service['pubClient'], 'quit');
      const subQuitSpy = jest.spyOn(service['subClient'], 'quit');

      await service.onModuleDestroy();

      expect(pubQuitSpy).toHaveBeenCalled();
      expect(subQuitSpy).toHaveBeenCalled();
    });
  });
});
