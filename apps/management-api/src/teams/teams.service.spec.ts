import { Test, TestingModule } from '@nestjs/testing';
import { TeamsService } from './teams.service';
import { AuthService } from '../auth/auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Team } from '@app/database';
import {describe, beforeEach, it, expect} from '@jest/globals';

describe('TeamsService', () => {
  let service: TeamsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TeamsService,
              {
                provide: AuthService,
                useValue: {},
              },
              {
                provide: getRepositoryToken(Team),
                useValue: {},
              },
            ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
