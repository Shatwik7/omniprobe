import { Test, TestingModule } from '@nestjs/testing';
import { AlertEngineModule } from './alert-engine.module';
import { describe, beforeEach, it, expect } from '@jest/globals';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsController } from './analytics/analytics.controller';
import { AnalyticsService } from './analytics/analytics.service';

describe('AlertEngineModule', () => {
  let controller: AnalyticsController;
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({
            REDIS_URL: 'redis://localhost:6379',
          })],
        }),
        AlertEngineModule,
      ],
    }).compile();
    controller =module.get<AnalyticsController>(AnalyticsController);
    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });
});
