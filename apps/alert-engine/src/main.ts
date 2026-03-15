import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AlertEngineModule } from './alert-engine.module';
import { ensureTopics } from '@app/kafka-topics';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  await ensureTopics();
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AlertEngineModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: [process.env.KAFKA_URL || 'localhost:9092'], // Use 'kafka:29092' if running inside Docker
          retry: {
            retries: 10,
          },
        },
        consumer: {
          groupId: 'monitoring-alert-engine-group',
        },
      },
    },
  );
  await app.listen().then(() => {
    console.log('Alert Engine Service is consuming Kafka events...');
  });
}
bootstrap().catch((err) => console.log(err));
