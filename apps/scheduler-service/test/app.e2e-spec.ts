import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SchedulerServiceModule } from './../src/scheduler-service.module';
import { CheckSchedulerService } from './../src/CheckScheduler.service';
import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';

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

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [SchedulerServiceModule],
    });

    moduleBuilder
      .overrideProvider(CheckSchedulerService)
      .useValue({
        onModuleInit: jest.fn(),
        processDueMonitors: jest.fn(),
      });

    const moduleFixture: TestingModule = await moduleBuilder.compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });
});
