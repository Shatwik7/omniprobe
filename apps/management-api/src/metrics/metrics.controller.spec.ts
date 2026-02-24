import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { describe, beforeEach, it, expect } from '@jest/globals';
import { LongPollingService } from '@app/common';
import { AuthService } from '../auth/auth.service';
import { Metric, Monitor, Project, Team } from '@app/database';
import { getRepositoryToken } from '@nestjs/typeorm';


describe('MetricsController', () => {
  let controller: MetricsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [MetricsService,
        {
          provide: AuthService,
          useValue: {},
        },
        {
          provide: LongPollingService,
          useValue: {},
        },
        {
          provide: getRepositoryToken(Monitor),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Metric),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Team),
          useValue: {},
        }
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
