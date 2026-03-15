import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsRepository } from './analytics.repository';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaProducerService } from './kafka-producer.service';
import { LongPollingModule } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LongPollingModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redisUrl: config.get<string>('REDIS_URL') || 'redis://localhost:6379',
      }),
    }),
    DatabaseModule,
    // kafka producer client registration for alerts
    ClientsModule.register([
      {
        name: 'KAFKA_PRODUCER',
        transport: Transport.KAFKA,
        options: {
          producerOnlyMode: true,
          client: {
            clientId: 'alert-engine-producer',
            brokers: [process.env.KAFKA_URL || 'localhost:9092'],
            retry: {
              retries: 10,
              initialRetryTime: 1000,
              factor: 2,
              maxRetryTime: 60000,
            },
          },
        },
      },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsRepository,
    KafkaProducerService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const redisConfig: any = {
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          enableReadyCheck: false,
          enableOfflineQueue: true,
        };

        const redisUrl = configService.get<string>('REDIS_URL') || process.env.REDIS_URL || 'redis://localhost:6379';
        if (redisUrl) {
          return new Redis(redisUrl, redisConfig);
        }

        return new Redis(redisConfig);
      },
      inject: [ConfigService],
    },
  ],
  exports: [AnalyticsRepository, AnalyticsService, KafkaProducerService],
})
export class AnalyticsModule { }
