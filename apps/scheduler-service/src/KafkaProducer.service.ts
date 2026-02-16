import { CheckExecutionRequestedEvent, Topics } from "@app/kafka-topics";
import { Inject, Injectable } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";



@Injectable()
export class KafkaProducerService{
    constructor(
        @Inject('KAFKA_PRODUCER') private readonly kafkaClient: ClientKafka,
    ){}
    async emitCheckExecutionRequested(data: CheckExecutionRequestedEvent) {
        try{
            this.kafkaClient.emit(Topics.CHECK_EXECUTION_REQUESTED, data);
            return true;
        } catch (error) {
            console.error('Error emitting Kafka event:', error);
            return false;
        }
    }
}