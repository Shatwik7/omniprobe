import { Controller, Get } from '@nestjs/common';
import { IngestServiceService } from './ingest-service.service';

@Controller()
export class IngestServiceController {
  constructor(private readonly ingestServiceService: IngestServiceService) {}

  @Get()
  getHello(): string {
    return this.ingestServiceService.getHello();
  }
}
