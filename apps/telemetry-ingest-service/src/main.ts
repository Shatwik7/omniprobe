import { NestFactory } from '@nestjs/core';
import { TelemetryIngestServiceModule } from './telemetry-ingest-service.module';

async function bootstrap() {
  const app = await NestFactory.create(TelemetryIngestServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
