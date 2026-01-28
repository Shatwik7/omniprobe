import { Test, TestingModule } from '@nestjs/testing';
import { AlertPolicyController } from './alert-policy.controller';
import { AlertPolicyService } from './alert-policy.service';

describe('AlertPolicyController', () => {
  let controller: AlertPolicyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertPolicyController],
      providers: [AlertPolicyService],
    }).compile();

    controller = module.get<AlertPolicyController>(AlertPolicyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
