import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { SchedulerServiceModule } from './scheduler-service.module';
import * as dotenv from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(SchedulerServiceModule, {
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [process.env.KAFKA_URL || 'localhost:9092'], // Use the service name from your docker-compose
      },
      consumer: {
        groupId: 'api-monitor-consumer', // Unique ID for this service
      }
    }
  });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, 
        forbidNonWhitelisted: true,
        transform: true,
        stopAtFirstError: true,
        disableErrorMessages: true,
      }),
    );
  

  await app.listen();
  console.log('Kafka Microservice is listening...');
}
bootstrap();