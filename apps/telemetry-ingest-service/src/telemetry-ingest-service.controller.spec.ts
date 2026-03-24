import { Test, TestingModule } from '@nestjs/testing';
import { TelemetryIngestServiceController } from './telemetry-ingest-service.controller';
import { TelemetryIngestServiceService } from './telemetry-ingest-service.service';

describe('TelemetryIngestServiceController', () => {
  let telemetryIngestServiceController: TelemetryIngestServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [TelemetryIngestServiceController],
      providers: [TelemetryIngestServiceService],
    }).compile();

    telemetryIngestServiceController = app.get<TelemetryIngestServiceController>(TelemetryIngestServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(telemetryIngestServiceController.getHello()).toBe('Hello World!');
    });
  });
});
