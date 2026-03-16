import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { WorkerServiceModule } from './worker-service.module';
import { ensureTopics } from '@app/kafka-topics';
import { ValidationPipe } from '@nestjs/common';

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
          groupId: 'monitoring-worker-group'+String(process.env.REGION || 'IN'),
        },
      },
    },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
      disableErrorMessages: true,
      exceptionFactory: (errors) => {
        console.error(
          'Validation failed for incoming Kafka message:',
          JSON.stringify(errors),
        );
        return null;
      },
    }),
  );
  await app.listen().then(() => {
    console.log('Worker Service is consuming Kafka events...');
  });
}
bootstrap();
