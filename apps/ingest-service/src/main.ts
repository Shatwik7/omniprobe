import * as dotenv from 'dotenv';
dotenv.config();

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ensureTopics } from '@app/kafka-topics';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { IngestServiceModule } from './ingest-service.module';

async function bootstrap() {
  await ensureTopics();
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    IngestServiceModule,
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
          groupId: 'ingest-service-consumer',
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
    console.log('Ingest Service is consuming Kafka events...');
  });
}

bootstrap().catch((err) => console.log(err));