import { Test, TestingModule } from '@nestjs/testing';
import { AlertPolicyController } from './alert-policy.controller';
import { AlertPolicyService } from './alert-policy.service';
import { AuthService } from '../auth/auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Team } from '@app/database';
import { describe, beforeEach, it, expect } from '@jest/globals';

describe('AlertPolicyController', () => {
  let controller: AlertPolicyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertPolicyController],
      providers: [
        AlertPolicyService,
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

    controller = module.get<AlertPolicyController>(AlertPolicyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
