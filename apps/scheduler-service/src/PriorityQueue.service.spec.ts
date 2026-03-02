import { Test, TestingModule } from '@nestjs/testing';
import { PriorityQueue } from './PriorityQueue.service';
import { describe, it, expect, afterAll, beforeAll } from '@jest/globals';

describe('PriorityQueue (Integration)', () => {
  let service: PriorityQueue;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [PriorityQueue],
    }).compile();

    service = module.get<PriorityQueue>(PriorityQueue);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Redis Operations', () => {
    const testQueue = 'test-priority-queue';

    it('should add, get due items, and remove items from Redis', async () => {
      const now = Date.now();
      const item1 = 'monitor-1';
      const item2 = 'monitor-2';
      const item3 = 'monitor-3';

      // Cleanup before starting
      await service.getClient().del(testQueue);

      //Add items with different scores (timestamps)
      await service.addItem(testQueue, now - 5000, item1); // Due
      await service.addItem(testQueue, now - 1000, item2); // Due
      await service.addItem(testQueue, now + 5000, item3); // Not due

      const dueItems = await service.getDueItems(10, testQueue, now);
      
      expect(dueItems).toHaveLength(2);
      expect(dueItems).toContain(item1);
      expect(dueItems).toContain(item2);
      expect(dueItems).not.toContain(item3);
      const removedCount = await service.removeItem(testQueue, item1);
      expect(removedCount).toBe(1);
      const remainingItems = await service.getDueItems(10, testQueue, now);
      expect(remainingItems).toHaveLength(1);
      expect(remainingItems).toContain(item2);
      await service.getClient().del(testQueue);
    });
  });

  describe('Data Existence Check', () => {
    const queueName = 'test-data-existence';

    it('should check and set data existence in Redis', async () => {
      await service.getClient().del(`priority-queue:${queueName}`);
      let exists = await service.checkDataExists(queueName);
      expect(exists).toBe(false);
      await service.setDataExists(queueName, '1', 10);

      exists = await service.checkDataExists(queueName);
      expect(exists).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 11000)); // Wait 11 seconds
      exists = await service.checkDataExists(queueName);
      expect(exists).toBe(false);
    }, 15000);
  });
});
