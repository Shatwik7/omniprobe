import { Logger, Module } from '@nestjs/common';
import { WorkerController } from './worker-service.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CheckExecutorService } from './checkExecutor.service';
import { CheckExecutionEventProducerService } from './KafkaProducer.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_PRODUCER',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'scheduler-producer',
            brokers: ['localhost:9092'],
            retry: {
              retries: 10,
            }
          },
        },
      },
    ]),
  ],
  controllers: [WorkerController],
  providers: [CheckExecutorService, CheckExecutionEventProducerService],
})
export class WorkerServiceModule { }
