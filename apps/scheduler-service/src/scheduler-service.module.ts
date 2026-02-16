import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CheckSchedulerService } from './CheckScheduler.service';
import { KafkaProducerService } from './KafkaProducer.service';
import { CheckSchedulerController } from './CheckScheduler.controller';
import { CacheService } from './Cache.service';
import { PriorityQueue } from './PriorityQueue.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ClientsModule.register([
      {
        name: 'KAFKA_PRODUCER',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'scheduler-producer',
            brokers: ['localhost:9092'],
          },
        },
      },
    ]),
  ],
  controllers:[CheckSchedulerController],
  providers: [CheckSchedulerService,KafkaProducerService,CacheService,PriorityQueue],
})
export class SchedulerServiceModule {}
