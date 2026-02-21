import { Controller, Inject } from '@nestjs/common';
import { IngestServiceService } from './ingest-service.service';
import { ClientKafka, EventPattern, Payload } from '@nestjs/microservices';
import {
  CheckExecutionCompletedEvent,
  CheckExecutionFailedEvent,
  Topics
} from '@app/kafka-topics';

import { transformAndValidate } from '@app/common/validation/validate-message';

@Controller()
export class IngestServiceController {
  constructor(
    private readonly ingestServiceService: IngestServiceService,
    @Inject('KAFKA_PRODUCER') private readonly kafkaClient: ClientKafka,
  ) {}

  @EventPattern(Topics.CHECK_EXECUTION_COMPLETED)
  async handleCheckExecutionCompleted(@Payload() message: unknown) {

    const data = await transformAndValidate(CheckExecutionCompletedEvent, message);
    if (!data) return;

    await this.ingestServiceService.handleCheckCompletion(data);
  }

  @EventPattern(Topics.CHECK_EXECUTION_FAILED)
  async handleCheckExecutionFailed(@Payload() message: unknown) {

    const data = await transformAndValidate(CheckExecutionFailedEvent, message);
    if (!data) return;

    await this.ingestServiceService.handleCheckFailure(data);
  }
}