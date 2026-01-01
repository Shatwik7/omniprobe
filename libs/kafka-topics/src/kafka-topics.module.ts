import { Module } from '@nestjs/common';
import { KafkaTopicsService } from './kafka-topics.service';

@Module({
  providers: [KafkaTopicsService],
  exports: [KafkaTopicsService],
})
export class KafkaTopicsModule {}
