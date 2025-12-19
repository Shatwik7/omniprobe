import { Module } from '@nestjs/common';
import { IngestServiceController } from './ingest-service.controller';
import { IngestServiceService } from './ingest-service.service';

@Module({
  imports: [],
  controllers: [IngestServiceController],
  providers: [IngestServiceService],
})
export class IngestServiceModule {}
