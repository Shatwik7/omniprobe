import { Monitor, Project, User } from '@app/database';
import { CheckExecutionRequestedEvent, Topics } from '@app/kafka-topics';
import { HttpMethods } from '@app/kafka-topics/enums/HttpMethods';
import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';

@Injectable()
export class CheckDispatchScheduler  implements OnModuleInit, OnModuleDestroy {
  private readonly logger:Logger=new Logger(CheckDispatchScheduler.name)
  constructor(
    @Inject('KAFKA_PRODUCER') private readonly kafkaClient: ClientKafka,
    @InjectRepository(Monitor) private readonly monitorRepository: Repository<Monitor>
  ) {}

  // Connect the producer when the module starts
  async onModuleInit() {
    // await this.kafkaClient.connect();
  }

  async onModuleDestroy() {
    // await this.kafkaClient.close();
  }
  // This cron job runs every 10 seconds
  // You can also use standard cron syntax: @Cron('*/10 * * * * *')
  // @Cron(CronExpression.EVERY_10_SECONDS)
  // async handleCron() {

  //   const data:CheckExecutionRequestedEvent={
  //     id:randomUUID().toString(),
  //     checkId:randomUUID().toString(),
  //     url:"https://httpbin.org/status/200",
  //     method:HttpMethods.GET,
  //     timeout:3000,
  //     enqueuedAt:new Date().toISOString(),
  //     headers:{},
  //     body:""
  //   }  

    
  //   this.kafkaClient.emit(Topics.CHECK_EXECUTION_REQUESTED, data);
  //   this.logger.log(data);
  //   return;
  // }
}