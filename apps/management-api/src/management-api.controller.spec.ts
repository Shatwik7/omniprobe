import { Test, TestingModule } from '@nestjs/testing';
import { ManagementApiController } from './management-api.controller';
import { ManagementApiService } from './management-api.service';

describe('ManagementApiController', () => {
  let managementApiController: ManagementApiController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ManagementApiController],
      providers: [ManagementApiService],
    }).compile();

    managementApiController = app.get<ManagementApiController>(ManagementApiController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(managementApiController.getHello()).toBe('Hello World!');
    });
  });
});
