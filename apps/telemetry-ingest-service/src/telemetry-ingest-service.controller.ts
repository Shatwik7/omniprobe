import { Controller, Get } from '@nestjs/common';
import { TelemetryIngestServiceService } from './telemetry-ingest-service.service';

@Controller()
export class TelemetryIngestServiceController {
  constructor(private readonly telemetryIngestServiceService: TelemetryIngestServiceService) {}

  @Get()
  getHello(): string {
    return this.telemetryIngestServiceService.getHello();
  }
}
