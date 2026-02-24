import { Test, TestingModule } from '@nestjs/testing';
import { MonitorsService } from './monitors.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Monitor } from '@app/database';
import {describe, beforeEach, it, expect} from '@jest/globals';
import { Project, Team } from '@app/database';



describe('MonitorsService', () => {
  let service: MonitorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MonitorsService, {
        provide: getRepositoryToken(Monitor),
        useValue: {},
      },
        {
          provide: getRepositoryToken(Project),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Team),
          useValue: {},
        }],
    }).compile();

    service = module.get<MonitorsService>(MonitorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
