import { CheckExecutionRequestedEvent, Topics } from '@app/kafka-topics';
import { Controller, Get, Logger, ValidationPipe } from '@nestjs/common';
import {
  EventPattern,
  Payload,
  Ctx,
  KafkaContext,
} from '@nestjs/microservices';
import { CheckExecutorService } from './checkExecutor.service';
import { CheckExecutionEventProducerService } from './KafkaProducer.service';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Controller()
export class WorkerController {
  private readonly logger:Logger=new Logger(WorkerController.name);
  constructor(
    private readonly EventProducer: CheckExecutionEventProducerService,
    private readonly Processor: CheckExecutorService,
  ) {}
  @EventPattern(Topics.CHECK_EXECUTION_REQUESTED)
  async handleMonitoringData(
    @Payload() raw: any,
    @Ctx() context: KafkaContext,
  ) {
    this.logger.log(`Received event on topic ${Topics.CHECK_EXECUTION_REQUESTED}: ${JSON.stringify(raw)}`);
    try {
      const dto = plainToInstance(CheckExecutionRequestedEvent, raw);
      const errors = await validate(dto);
      if (errors.length > 0) {
        this.logger.error('❌ Invalid message. Skipping.');
        return;
      }

      const data = await this.Processor.collectHttpTimingMetrics(dto.url);
      this.logger.log(`Collected HTTP timing metrics: ${JSON.stringify(data)}`) ;

      if (data.success) {
        this.EventProducer.CheckCompleted({
          Request: dto,
          Response: data.metrics,
          region: process.env.REGION || 'IN',
        });
      } else {
        this.EventProducer.CheckFailed({
          Request: dto,
          Response: data.error,
          region: process.env.REGION || 'IN',
        });
      }
    } catch (e) {
      this.logger.error('Unexpected error:', e);
    }
  }
}
