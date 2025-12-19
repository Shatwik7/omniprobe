import { Test, TestingModule } from '@nestjs/testing';
import { IngestServiceController } from './ingest-service.controller';
import { IngestServiceService } from './ingest-service.service';

describe('IngestServiceController', () => {
  let ingestServiceController: IngestServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [IngestServiceController],
      providers: [IngestServiceService],
    }).compile();

    ingestServiceController = app.get<IngestServiceController>(IngestServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(ingestServiceController.getHello()).toBe('Hello World!');
    });
  });
});
