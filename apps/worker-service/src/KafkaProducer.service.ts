import {
  CheckExecutionCompletedEvent,
  CheckExecutionFailedEvent,
  Topics,
} from '@app/kafka-topics';
import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class CheckExecutionEventProducerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger: Logger = new Logger(
    CheckExecutionEventProducerService.name,
  );
  constructor(
    @Inject('KAFKA_PRODUCER') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await this.kafkaClient.connect();
    this.logger.log('PRODUCER CONNECTED TO KAFKA');
  }

  async onModuleDestroy() {
    await this.kafkaClient.close();
  }

  CheckFailed(data: CheckExecutionFailedEvent) {
    this.kafkaClient.emit(
      Topics.CHECK_EXECUTION_FAILED,
      data,
    );
    return;
  }

  CheckCompleted(data: CheckExecutionCompletedEvent) {
    this.kafkaClient.emit(
      Topics.CHECK_EXECUTION_COMPLETED,
      data,
    );
    return;
  }
}
