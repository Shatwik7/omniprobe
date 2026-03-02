import 'reflect-metadata';
import { CheckSchedulerController } from "./CheckScheduler.controller";
import { PriorityQueue } from "./PriorityQueue.service";
import { Test, TestingModule } from "@nestjs/testing";
import { describe, jest, beforeEach, afterEach, it, expect } from "@jest/globals";
import { CheckExecutionAddEvent } from '@app/kafka-topics';

describe('CheckSchedulerController', () => {
    let controller: CheckSchedulerController;
    let priorityQueue: PriorityQueue;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CheckSchedulerController],
            providers: [PriorityQueue],
        }).compile();

        controller = module.get<CheckSchedulerController>(CheckSchedulerController);
        priorityQueue = module.get<PriorityQueue>(PriorityQueue);
    });

      afterEach(() => {
        jest.restoreAllMocks();
      });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should add item to priority queue on object CheckExecutionAddEvent', async () => {
      const mockData:CheckExecutionAddEvent={
        id: '123e4567-e89b-12d3-a456-426614174000',
        frequency: 5, // 5 seconds
      }
      const addItemSpy = jest.spyOn(priorityQueue, 'addItem').mockResolvedValue(1);

      await controller.handleCheckExecutionRequested(mockData);

      expect(addItemSpy).toHaveBeenCalledWith(
        'check-execution-queue',
        expect.any(Number), // Score should be a timestamp
        mockData.id
      );
    });

    it('should add item to priority queue on JSON string CheckExecutionAddEvent', async () => {
      const mockData:CheckExecutionAddEvent={
        id: '123e4567-e89b-12d3-a456-426614174000',
        frequency: 5,
      }
      const addItemSpy = jest.spyOn(priorityQueue, 'addItem').mockResolvedValue(1);

      await controller.handleCheckExecutionRequested(JSON.stringify(mockData));

      expect(addItemSpy).toHaveBeenCalledWith(
        'check-execution-queue',
        expect.any(Number), // Score should be a timestamp
        mockData.id
      );
    });

    it('should skip malformed JSON payload', async () => {
      const addItemSpy = jest.spyOn(priorityQueue, 'addItem').mockResolvedValue(1);
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      await controller.handleCheckExecutionRequested('{bad-json');

      expect(addItemSpy).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith('❌ Invalid message. Skipping.');
    });

    it('should skip invalid DTO payload', async () => {
      const invalidPayload = {
        id: 'not-a-uuid',
        frequency: -1,
      };
      const addItemSpy = jest.spyOn(priorityQueue, 'addItem').mockResolvedValue(1);
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      await controller.handleCheckExecutionRequested(invalidPayload);

      expect(addItemSpy).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith('❌ Invalid message. Skipping.');
    });
    
});