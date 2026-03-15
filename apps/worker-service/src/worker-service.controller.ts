import { CheckExecutionRequestedEvent, Topics } from '@app/kafka-topics';
import { Controller, Logger, ValidationPipe } from '@nestjs/common';
import {
  EventPattern,
  Payload,
  Ctx,
  KafkaContext,
} from '@nestjs/microservices';
import { CheckExecutorService } from './checkExecutor.service';
import { CheckExecutionEventProducerService } from './KafkaProducer.service';

@Controller()
export class WorkerController {
  private readonly logger: Logger = new Logger(WorkerController.name);
  private readonly pipeValidator = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    stopAtFirstError: true,
  });

  constructor(
    private readonly EventProducer: CheckExecutionEventProducerService,
    private readonly Processor: CheckExecutorService,
  ) {}

  @EventPattern(Topics.CHECK_EXECUTION_REQUESTED)
  async handleMonitoringData(
    @Payload() raw: unknown,
    @Ctx() context: KafkaContext,
  ) {
    try {
      this.logger.log(
        `Received event on topic ${Topics.CHECK_EXECUTION_REQUESTED}: ${JSON.stringify(raw)}`,
      );

      const validateMessage =
        (await this.pipeValidator.transform(raw, {
          type: 'body',
          metatype: CheckExecutionRequestedEvent,
        })) as CheckExecutionRequestedEvent;

      const data = await this.Processor.collectHttpTimingMetrics(
        validateMessage.url,
        {
          method: validateMessage.method,
          timeout: validateMessage.timeout,
          headers: validateMessage.headers,
          body: validateMessage.body,
        },
      );

      this.logger.log(
        `Collected HTTP timing metrics: ${JSON.stringify(data)}`,
      );

      if (data.success) {
        this.EventProducer.CheckCompleted({
          Request: validateMessage,
          Response: data.metrics,
          region: process.env.REGION || 'IN',
        });
      } else {
        this.EventProducer.CheckFailed({
          Request: validateMessage,
          Response: data.error,
          region: process.env.REGION || 'IN',
        });
      }
    } catch (e) {
      this.logger.error('Invalid message or unexpected error. Skipping.', e);
    }
  }
}
