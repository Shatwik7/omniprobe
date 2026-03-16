import * as dotenv from 'dotenv';
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { SchedulerServiceModule } from './scheduler-service.module';

import { ValidationPipe } from '@nestjs/common';
import { ensureTopics } from '@app/kafka-topics';
import { Logger } from '@nestjs/common';
async function bootstrap() {
  await ensureTopics();
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    SchedulerServiceModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: [process.env.KAFKA_URL || 'localhost:9092'],
          retry: {
            retries: 10,
            initialRetryTime: 1000,
            factor: 2,
            maxRetryTime: 60000
          }  // Use the service name from your docker-compose
        },
        consumer: {
          groupId: 'api-monitor-consumer', // Unique ID for this service
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
        const logger = new Logger('ValidationPipe');
        logger.error(
          'Validation failed for incoming Kafka message:',
          JSON.stringify(errors),
        );
        return null;
      }
    }),
  );

  await app.listen();
  console.log('Scheduler Service working...');
}
bootstrap();
