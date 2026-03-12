import { AlertTriggeredEvent, Topics } from '@app/kafka-topics';
import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class KafkaProducerService {
  constructor(
    @Inject('KAFKA_PRODUCER') private readonly kafkaClient: ClientKafka,
  ) {}

  async emitAlertTriggered(data: AlertTriggeredEvent) {
    try {
      this.kafkaClient.emit(Topics.ALERTS_TRIGGERED_NOTIFICATIONS, data);
      return true;
    } catch (error) {
      console.error('Error emitting alert triggered event:', error);
      return false;
    }
  }
}
