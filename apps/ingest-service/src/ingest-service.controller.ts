import { Controller, Inject, Logger } from '@nestjs/common';
import { IngestServiceService } from './ingest-service.service';
import { ClientKafka, EventPattern, Payload } from '@nestjs/microservices';
import {
  CheckExecutionCompletedEvent,
  CheckExecutionFailedEvent,
  Topics,
} from '@app/kafka-topics';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Controller()
export class IngestServiceController {
  private readonly logger = new Logger('IngestServiceController');

  constructor(
    private readonly ingestServiceService: IngestServiceService,
    @Inject('KAFKA_PRODUCER') private readonly kafkaClient: ClientKafka,
  ) {}

  private toCheckExecutionCompletedEvent(
    data: unknown,
  ): CheckExecutionCompletedEvent | null {
    let parsedData: unknown = data;

    if (typeof parsedData === 'string') {
      try {
        parsedData = JSON.parse(parsedData);
      } catch {
        return null;
      }
    }

    if (
      !parsedData ||
      typeof parsedData !== 'object' ||
      Array.isArray(parsedData)
    ) {
      return null;
    }

    return plainToInstance(CheckExecutionCompletedEvent, parsedData);
  }

  private toCheckExecutionFailedEvent(
    data: unknown,
  ): CheckExecutionFailedEvent | null {
    let parsedData: unknown = data;

    if (typeof parsedData === 'string') {
      try {
        parsedData = JSON.parse(parsedData);
      } catch {
        return null;
      }
    }

    if (
      !parsedData ||
      typeof parsedData !== 'object' ||
      Array.isArray(parsedData)
    ) {
      return null;
    }

    return plainToInstance(CheckExecutionFailedEvent, parsedData);
  }

  @EventPattern(Topics.CHECK_EXECUTION_COMPLETED)
  async handleCheckExecutionCompleted(@Payload() message: unknown) {
    const data = this.toCheckExecutionCompletedEvent(message);
    if (!data) return;

    const errors = await validate(data);
    if (errors.length > 0) {
      this.logger.log('❌ Invalid message. Skipping.');
      return;
    }

    await this.ingestServiceService.handleCheckCompletion(data);
  }

  @EventPattern(Topics.CHECK_EXECUTION_FAILED)
  async handleCheckExecutionFailed(@Payload() message: unknown) {
    const data = this.toCheckExecutionFailedEvent(message);
    if (!data) return;

    const errors = await validate(data);
    if (errors.length > 0) {
      this.logger.log('❌ Invalid message. Skipping.');
      return;
    }

    await this.ingestServiceService.handleCheckFailure(data);
  }
}
