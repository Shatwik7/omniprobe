import { Test, TestingModule } from '@nestjs/testing';
import { AlertEngineController } from './alert-engine.controller';
import { AlertEngineService } from './alert-engine.service';

describe('AlertEngineController', () => {
  let alertEngineController: AlertEngineController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AlertEngineController],
      providers: [AlertEngineService],
    }).compile();

    alertEngineController = app.get<AlertEngineController>(AlertEngineController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(alertEngineController.getHello()).toBe('Hello World!');
    });
  });
});
