import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './Cache.service';
import { Monitor } from '@app/database';
import {
  describe,
  it,
  expect,
  afterAll,
  beforeAll,
  jest,
  afterEach,
} from '@jest/globals';
import Redis from 'ioredis';

/**
 * NOTE: This is an integration test that connects to a real Redis instance.
 * Make sure Redis is running locally on the default port (6379) before executing.
 * You can start Redis using Docker: `docker run -p 6379:6379 redis`
 *
 * This test verifies that the CacheService can set and get a Monitor object correctly.
 * It uses the setMonitor/getMonitor methods which handle JSON serialization.
 * After the test, it cleans up by deleting the test key from Redis.
 */
jest.setTimeout(30000);

describe('CacheService (Integration)', () => {
  let service: CacheService;
  let module: TestingModule; // Store module reference
  let redisClient: Redis;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [CacheService],
    }).compile();

    service = module.get<CacheService>(CacheService);
    redisClient = service.getClient();
  });

  // THIS IS THE CRITICAL STEP TO STOP THE HANGING
  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getClient', () => {
    it('should return a redis client instance', () => {
      const client = service.getClient();
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(Redis);
    });
  });

  describe('set / get / delete (Hash operations)', () => {
    const monitor: Monitor = new Monitor();
    monitor.id = 'hash-test-1';

    afterEach(async () => {
      // Cleanup hash key
      await redisClient.del(`monitor:${monitor.id}`);
    });

    it('should handle hset with only key and field (which is a bug in usage)', async () => {
      // The `set` method calls `hset(key, value)` when ttl is not provided.
      // ioredis interprets this as setting a field with an empty string value.
      await service.set(monitor, 'a-field');
      const result = await redisClient.hgetall(`monitor:${monitor.id}`);
      expect(result).toEqual({ 'a-field': '' });
    });

    it('should handle hset with ttl (which is a bug in implementation)', async () => {
      // The `set` method calls `hset(key, value, 'EX', ttlSeconds)`.
      // This is incorrect for setting TTL on a hash.
      // It will set a field `value` to `'EX'` and a field `ttlSeconds` to `''`.
      await service.set(monitor, 'fieldWithTtl', 60);
      const result = await redisClient.hgetall(`monitor:${monitor.id}`);
      expect(result).toEqual({ fieldWithTtl: 'EX', '60': '' });

      // Verify that no TTL was set on the key
      const ttl = await redisClient.ttl(`monitor:${monitor.id}`);
      expect(ttl).toBe(-1);
    });

    it('should get a hash object using get()', async () => {
      const key = `monitor:${monitor.id}`;
      const hashData = { name: 'test-name', status: 'passing' };
      await redisClient.hset(key, hashData);

      const result = await service.get(monitor.id);
      expect(result).toEqual(hashData);
    });

    it('should delete a hash using delete()', async () => {
      const key = `monitor:${monitor.id}`;
      await redisClient.hset(key, 'name', 'test-name');

      await service.delete(monitor);

      const result = await redisClient.exists(key);
      expect(result).toBe(0);
    });
  });

  describe('Bootstrap Lock', () => {
    afterEach(async () => {
      // Ensure locks are cleaned up after each test
      await redisClient.del('monitor:bootstrap-lock:0');
      await redisClient.del('monitor:bootstrap-lock:1');
    });

    it('should acquire a bootstrap lock and return true', async () => {
      const acquired = await service.tryAcquireBootstrapLock(1);
      expect(acquired).toBe(true);

      const lockValue = await redisClient.get('monitor:bootstrap-lock:1');
      expect(lockValue).toBe('1');

      const ttl = await redisClient.ttl('monitor:bootstrap-lock:1');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(600);
    });

    it('should fail to acquire an already held lock and return false', async () => {
      await service.tryAcquireBootstrapLock(1); // acquire first
      const acquiredAgain = await service.tryAcquireBootstrapLock(1); // try again
      expect(acquiredAgain).toBe(false);
    });

    it('should release a bootstrap lock', async () => {
      await service.tryAcquireBootstrapLock(1);
      await service.tryReleaseBootstrapLock(1);
      const lockValue = await redisClient.get('monitor:bootstrap-lock:1');
      expect(lockValue).toBeNull();
    });

    it('should be able to acquire a lock after it is released', async () => {
      await service.tryAcquireBootstrapLock(1);
      await service.tryReleaseBootstrapLock(1);
      const acquiredAfterRelease = await service.tryAcquireBootstrapLock(1);
      expect(acquiredAfterRelease).toBe(true);
    });

    it('should use default shard 0 for lock methods', async () => {
      const acquired = await service.tryAcquireBootstrapLock();
      expect(acquired).toBe(true);
      const lockValue = await redisClient.get('monitor:bootstrap-lock:0');
      expect(lockValue).toBe('1');

      await service.tryReleaseBootstrapLock();
      const lockValueAfterRelease = await redisClient.get(
        'monitor:bootstrap-lock:0',
      );
      expect(lockValueAfterRelease).toBeNull();
    });
  });

  describe('setMonitor / getMonitor', () => {
    it('should set and get a value in real Redis', async () => {
      const monitor: Monitor = new Monitor();
      monitor.id = '1';
      monitor.name = 'Test Monitor';
      monitor.target = 'http://example.com';
      monitor.method = 'GET';
      monitor.frequencySeconds = 60;
      monitor.headers = { 'Content-Type': 'application/json' };
      monitor.body = '';

      await service.setMonitor(monitor);

      const data = await service.getMonitor('1');

      expect(data).toBeDefined();
      expect(data?.id).toBe(monitor.id);
      expect(data?.name).toBe(monitor.name);

      await service.deleteMonitor('1');
    });

    it('should return null for non-existent key', async () => {
      const data = await service.getMonitor('non-existent-id');
      expect(data).toBeNull();
    });

    it('should delete a monitor', async () => {
      const monitor: Monitor = new Monitor();
      monitor.id = '2';
      monitor.name = 'To Be Deleted';
      monitor.target = 'http://example.com';
      monitor.method = 'GET';
      monitor.frequencySeconds = 60;
      monitor.headers = { 'Content-Type': 'application/json' };
      monitor.body = '';

      await service.setMonitor(monitor);
      await service.deleteMonitor('2');

      const data = await service.getMonitor('2');
      expect(data).toBeNull();
    });

    it('should handle multiple monitors', async () => {
      const monitor1: Monitor = new Monitor();
      monitor1.id = '3';
      monitor1.name = 'Monitor 3';
      monitor1.target = 'http://example.com/3';
      monitor1.method = 'GET';
      monitor1.frequencySeconds = 60;
      monitor1.headers = { 'Content-Type': 'application/json' };
      monitor1.body = '';

      const monitor2: Monitor = new Monitor();
      monitor2.id = '4';
      monitor2.name = 'Monitor 4';
      monitor2.target = 'http://example.com/4';
      monitor2.method = 'POST';
      monitor2.frequencySeconds = 120;
      monitor2.headers = { 'Content-Type': 'application/json' };
      monitor2.body = JSON.stringify({ key: 'value' });

      await service.setMonitor(monitor1);
      await service.setMonitor(monitor2);

      const data1 = await service.getMonitor('3');
      const data2 = await service.getMonitor('4');

      expect(data1).toBeDefined();
      expect(data1?.id).toBe(monitor1.id);
      expect(data1?.name).toBe(monitor1.name);

      expect(data2).toBeDefined();
      expect(data2?.id).toBe(monitor2.id);
      expect(data2?.name).toBe(monitor2.name);

      // Cleanup
      await service.deleteMonitor('3');
      await service.deleteMonitor('4');
    });
  });
});
