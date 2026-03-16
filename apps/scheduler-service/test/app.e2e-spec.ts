import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SchedulerServiceModule } from '../src/scheduler-service.module';
import { CheckSchedulerService } from '../src/CheckScheduler.service';
import {
  describe,
  beforeEach,
  afterEach,
  it,
  expect,
  jest,
} from '@jest/globals';
import { CheckSchedulerController } from '../src/CheckScheduler.controller';
import { PriorityQueue } from '../src/PriorityQueue.service';
import { CheckExecutionAddEvent } from '@app/kafka-topics';
import { v4 as uuidv4 } from 'uuid';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { Module } from '@nestjs/common';

@Module({})
class MockDatabaseModule {}

jest.mock('kafkajs', () => {
  const events = {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
  };
  return {
    Kafka: class {
      producer() {
        return {
          connect: () => Promise.resolve(),
          disconnect: () => Promise.resolve(),
          send: () => Promise.resolve(),
          on: () => {},
          events,
        };
      }
      consumer() {
        return {
          connect: () => Promise.resolve(),
          disconnect: () => Promise.resolve(),
          subscribe: () => Promise.resolve(),
          run: () => Promise.resolve(),
          on: () => {},
          events,
        };
      }
    },
    logLevel: { NOTHING: 0, ERROR: 1, WARN: 2, INFO: 4, DEBUG: 5 },
  };
});

describe('SchedulerServiceController (e2e)', () => {
  let app: INestApplication;
  let controller: CheckSchedulerController;
  let priorityQueue: PriorityQueue;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [
        SchedulerServiceModule,
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
    })
      .overrideModule(DatabaseModule)
      .useModule(MockDatabaseModule);

    moduleBuilder.overrideProvider(CheckSchedulerService).useValue({
      onModuleInit: jest.fn(),
      processDueMonitors: jest.fn(),
    });

    const moduleFixture: TestingModule = await moduleBuilder.compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    controller = moduleFixture.get<CheckSchedulerController>(
      CheckSchedulerController,
    );
    priorityQueue = moduleFixture.get<PriorityQueue>(PriorityQueue);
  }, 20000);

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });

  describe('handleCheckExecutionRequested', () => {
    it('should process a valid message and add to priority queue', async () => {
      const addItemSpy = jest.spyOn(priorityQueue, 'addItem');
      const data: CheckExecutionAddEvent = {
        id: uuidv4(),
        frequency: 60,
      };

      await controller.handleCheckExecutionRequested(data);

      expect(addItemSpy).toHaveBeenCalledWith(
        'monitors',
        expect.any(Number),
        data.id,
      );
    });

    it('should handle invalid JSON message', async () => {
      const errorSpy = jest
        .spyOn((controller as any).logger, 'error')
        .mockImplementation(() => undefined);
      const addItemSpy = jest.spyOn(priorityQueue, 'addItem');
      const invalidData = 'invalid-json';

      await controller.handleCheckExecutionRequested(invalidData);

      expect(errorSpy).toHaveBeenCalledWith('❌ Invalid message. Skipping.');
      expect(addItemSpy).not.toHaveBeenCalled();
    });

    it('should handle message with validation errors', async () => {
      const errorSpy = jest
        .spyOn((controller as any).logger, 'error')
        .mockImplementation(() => undefined);
      const addItemSpy = jest.spyOn(priorityQueue, 'addItem');
      const invalidData = { id: 'not-a-uuid', frequency: -10 };

      await controller.handleCheckExecutionRequested(invalidData);

      expect(errorSpy).toHaveBeenCalledWith('❌ Invalid message. Skipping.');
      expect(addItemSpy).not.toHaveBeenCalled();
    });

    it('should handle non-object message', async () => {
        const errorSpy = jest
          .spyOn((controller as any).logger, 'error')
          .mockImplementation(() => undefined);
        const addItemSpy = jest.spyOn(priorityQueue, 'addItem');
        const invalidData = 123;
  
        await controller.handleCheckExecutionRequested(invalidData);
  
        expect(errorSpy).toHaveBeenCalledWith('❌ Invalid message. Skipping.');
        expect(addItemSpy).not.toHaveBeenCalled();
    });

    it('should handle array message', async () => {
        const errorSpy = jest
          .spyOn((controller as any).logger, 'error')
          .mockImplementation(() => undefined);
        const addItemSpy = jest.spyOn(priorityQueue, 'addItem');
        const invalidData = [ { id: uuidv4(), frequency: 60 }];
  
        await controller.handleCheckExecutionRequested(invalidData);
  
        expect(errorSpy).toHaveBeenCalledWith('❌ Invalid message. Skipping.');
        expect(addItemSpy).not.toHaveBeenCalled();
    });
  });
});
