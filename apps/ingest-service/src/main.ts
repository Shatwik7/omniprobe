import { NestFactory } from '@nestjs/core';
import { IngestServiceModule } from './ingest-service.module';

async function bootstrap() {
  const app = await NestFactory.create(IngestServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
