import { Module } from '@nestjs/common';
import { TelemetryIngestServiceController } from './telemetry-ingest-service.controller';
import { TelemetryIngestServiceService } from './telemetry-ingest-service.service';

@Module({
  imports: [],
  controllers: [TelemetryIngestServiceController],
  providers: [TelemetryIngestServiceService],
})
export class TelemetryIngestServiceModule {}
