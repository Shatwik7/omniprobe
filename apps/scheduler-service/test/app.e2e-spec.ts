import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SchedulerServiceModule } from './../src/scheduler-service.module';
import { CheckSchedulerService } from './../src/CheckScheduler.service';
import { describe, beforeEach, afterEach, it, expect } from '@jest/globals';

describe('SchedulerServiceController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [SchedulerServiceModule],
    });

    moduleBuilder
      .overrideProvider(CheckSchedulerService)
      .useValue({
        onModuleInit: async () => undefined,
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
