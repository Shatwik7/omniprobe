import { Test, TestingModule } from '@nestjs/testing';
import { MonitorsController } from './monitors.controller';
import { MonitorsService } from './monitors.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from '../auth/auth.service';
import { Monitor, Project, Team } from '@app/database';
import { describe, beforeEach, it, expect } from '@jest/globals';


describe('MonitorsController', () => {
  let controller: MonitorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitorsController],
      providers: [MonitorsService,
        {
          provide: AuthService,
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
          provide: getRepositoryToken(Team),
          useValue: {},
        }
      ],
    }).compile();

    controller = module.get<MonitorsController>(MonitorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
