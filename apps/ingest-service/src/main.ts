import { NestFactory } from '@nestjs/core';
import { IngestServiceModule } from './ingest-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(IngestServiceModule, {
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [process.env.KAFKA_URL || 'localhost:9092'], // Use 'kafka:9092' if running inside Docker
      },
      consumer: {
        groupId: 'monitoring-worker-group',
      },
    },
  });
  await app.listen();
}
bootstrap();
