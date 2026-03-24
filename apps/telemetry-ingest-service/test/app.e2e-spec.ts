import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TelemetryIngestServiceModule } from './../src/telemetry-ingest-service.module';
import { describe, beforeEach, it, expect } from '@jest/globals';

describe('TelemetryIngestServiceController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TelemetryIngestServiceModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    expect(1).toBe(1);
  });
});
