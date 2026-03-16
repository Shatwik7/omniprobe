import { Topics } from '@app/kafka-topics';
import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { plainToInstance } from 'class-transformer';
import { CheckExecutionAddEvent } from '@app/kafka-topics';
import { PriorityQueue } from './PriorityQueue.service';
import { validate } from 'class-validator';

@Controller()
export class CheckSchedulerController {
  private readonly logger = new Logger(CheckSchedulerController.name);

  constructor(private readonly priorityQueue: PriorityQueue) {}

  private toCheckExecutionAddEvent(
    data: unknown,
  ): CheckExecutionAddEvent | null {
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

    return plainToInstance(CheckExecutionAddEvent, parsedData);
  }

  @EventPattern(Topics.CHECK_EXECUTION_ADD)
  async handleCheckExecutionRequested(@Payload() data: unknown) {
    try {
      this.logger.log('Received CheckExecutionAddEvent', JSON.stringify(data));
      const dto = this.toCheckExecutionAddEvent(data);
      if (!dto) {
        this.logger.error('❌ Invalid message. Skipping.');
        return;
      }
      const erros = await validate(dto);
      if (erros.length > 0) {
        this.logger.error('❌ Invalid message. Skipping.');
        return;
      }
      await this.priorityQueue.addItem(
        'monitors',
        Date.now() + dto.frequency * 1000,
        dto.id,
      ); // Example: schedule for 5 seconds later
    } catch (e) {
      this.logger.error('Error processing check execution request:', e);
    }
  }
}
