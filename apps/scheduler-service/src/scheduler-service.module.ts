import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CheckSchedulerService } from './CheckScheduler.service';
import { KafkaProducerService } from './KafkaProducer.service';
import { CheckSchedulerController } from './CheckScheduler.controller';
import { CacheService } from './Cache.service';
import { PriorityQueue } from './PriorityQueue.service';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [
    DatabaseModule,
    ScheduleModule.forRoot(),
    ClientsModule.register([
      {
        name: 'KAFKA_PRODUCER',
        transport: Transport.KAFKA,
        options: {
          producerOnlyMode: true,
          client: {
            clientId: 'scheduler-producer',
            brokers: [process.env.KAFKA_URL || 'localhost:9092'],
            retry: {
              retries: 10,
              initialRetryTime: 1000,
              factor: 2,
              maxRetryTime: 60000
            }
          },
        },
      },
    ]),
  ],
  controllers: [CheckSchedulerController],
  providers: [
    CheckSchedulerService,
    KafkaProducerService,
    CacheService,
    PriorityQueue,
  ],
})
export class SchedulerServiceModule { }
