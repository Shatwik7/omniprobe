import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { WorkerServiceModule } from './../src/worker-service.module';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

jest.setTimeout(30000);

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
    logLevel: {
      NOTHING: 0,
      ERROR: 1,
      WARN: 2,
      INFO: 4,
      DEBUG: 5,
    },
  };
});

describe('WorkerServiceController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WorkerServiceModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });
});
