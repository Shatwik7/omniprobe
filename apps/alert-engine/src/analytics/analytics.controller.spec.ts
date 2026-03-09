import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { AnalyticsRepository } from './analytics.repository';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: jest.Mocked<AnalyticsService>;

  beforeEach(async () => {
    const mockAnalyticsService = {
      processMetricAndUpdateAnalytics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
        {
          provide: AnalyticsRepository,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get(AnalyticsService) as jest.Mocked<AnalyticsService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
