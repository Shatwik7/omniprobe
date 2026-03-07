import { Test, TestingModule } from '@nestjs/testing';
import { AlertEngineController } from './alert-engine.controller';
import { AlertEngineService } from './alert-engine.service';
import { AlertEngineModule } from './alert-engine.module';
import { describe, beforeEach, it, expect } from '@jest/globals';

describe('AlertEngineModule', () => {
  let controller: AlertEngineController;
  let service: AlertEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AlertEngineModule],
    }).compile();

    controller = module.get<AlertEngineController>(AlertEngineController);
    service = module.get<AlertEngineService>(AlertEngineService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      expect(controller.getHello()).toBe('Hello World!');
    });
  });
});
