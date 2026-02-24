import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
import {Metric, Monitor, Project} from '@app/database';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, it, expect} from '@jest/globals';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService,
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
        }
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
