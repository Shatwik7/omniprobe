import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { WorkerServiceModule } from './worker-service.module';
import { ensureTopics } from '@app/kafka-topics';

async function bootstrap() {
  await ensureTopics();
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    WorkerServiceModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: [process.env.KAFKA_URL || 'localhost:9092'], // Use 'kafka:29092' if running inside Docker
        },
        consumer: {
          groupId: 'monitoring-worker-group',
        },
      },
    },
  );
  await app.listen().then(() => {
    console.log('Worker Service is consuming Kafka events...');
  });
}
bootstrap();
