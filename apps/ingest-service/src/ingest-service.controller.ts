import { Controller, Inject, Logger, ValidationPipe } from '@nestjs/common';
import { IngestServiceService } from './ingest-service.service';
import { ClientKafka, EventPattern, Payload } from '@nestjs/microservices';
import {
  CheckExecutionCompletedEvent,
  CheckExecutionFailedEvent,
  Topics,
} from '@app/kafka-topics';

@Controller()
export class IngestServiceController {
  private readonly logger = new Logger('IngestServiceController');
  private readonly payloadValidationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    stopAtFirstError: true,
    disableErrorMessages: true,
    exceptionFactory: (errors) => {
      console.error(
        'Validation failed for incoming Kafka message:',
        JSON.stringify(errors),
      );
      return null;
    },
  });

  constructor(
    private readonly ingestServiceService: IngestServiceService,
    @Inject('KAFKA_PRODUCER') private readonly kafkaClient: ClientKafka,
  ) {}

  @EventPattern(Topics.CHECK_EXECUTION_COMPLETED)
  async handleCheckExecutionCompleted(@Payload() message: unknown) {
    this.logger.log('Received CheckExecutionCompletedEvent', message);

    try {
      const validatedMessage =
        (await this.payloadValidationPipe.transform(message, {
          type: 'body',
          metatype: CheckExecutionCompletedEvent,
        })) as CheckExecutionCompletedEvent;

      await this.ingestServiceService.handleCheckCompletion(validatedMessage);
    } catch {
      this.logger.log('Invalid completed-event message. Skipping.');
      return;
    }

    return null;
  }

  @EventPattern(Topics.CHECK_EXECUTION_FAILED)
  async handleCheckExecutionFailed(@Payload() message: unknown) {
    this.logger.log('Received CheckExecutionFailedEvent', message);

    try {
      const validatedMessage =
        (await this.payloadValidationPipe.transform(message, {
          type: 'body',
          metatype: CheckExecutionFailedEvent,
        })) as CheckExecutionFailedEvent;

      await this.ingestServiceService.handleCheckFailure(validatedMessage);
    } catch {
      this.logger.log('Invalid failed-event message. Skipping.');
      return;
    }

    return null;
  }
}
