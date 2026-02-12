import { CheckExecutionRequestedEvent, Topics } from '@app/kafka-topics';
import { Controller, Get, ValidationPipe } from '@nestjs/common';
import { EventPattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';
import { CheckExecutorService } from './checkExecutor.service';
import { CheckExecutionEventProducerService } from './KafkaProducer.service';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Controller()
export class WorkerController {

  constructor(
    private readonly EventProducer: CheckExecutionEventProducerService,
    private readonly Processor: CheckExecutorService
  ) { }
  @EventPattern(Topics.CHECK_EXECUTION_REQUESTED)
  async handleMonitoringData(@Payload() raw: any, @Ctx() context: KafkaContext) {
    try {
      const dto = plainToInstance(CheckExecutionRequestedEvent, raw);
      const errors = await validate(dto);

      if (errors.length > 0) {
        console.log("❌ Invalid message. Skipping.");
        return;
      }

      const data = await this.Processor.collectHttpTimingMetrics(dto.url);
      console.log(data);
      
      if (data.success) {
        this.EventProducer.CheckCompleted({
          Request: dto,
          Response: data.metrics
        })
      } else {
        this.EventProducer.CheckFailed({
          Request: dto,
          Response: data.error
        })
      }
    } catch (e) {
      console.error("Unexpected error:", e);
    }
  }
}