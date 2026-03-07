import { NestFactory } from '@nestjs/core';
import { IngestServiceModule } from './ingest-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ensureTopics } from '@app/kafka-topics';

async function bootstrap() {
  await ensureTopics();
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    IngestServiceModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: [process.env.KAFKA_URL || 'localhost:9092'],// Use 'kafka:9092' if running inside Docker
          retry: {
            retries: 10,
          } 
        },
        consumer: {
          groupId: 'monitoring-worker-group',
        },
      },
    },
  );
  await app.listen();
}
bootstrap().catch((err)=>console.log(err));