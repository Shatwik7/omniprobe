import { Test, TestingModule } from '@nestjs/testing';
import { AlertPolicyService } from './alert-policy.service';

describe('AlertPolicyService', () => {
  let service: AlertPolicyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertPolicyService],
    }).compile();

    service = module.get<AlertPolicyService>(AlertPolicyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
