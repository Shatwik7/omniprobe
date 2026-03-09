import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsRepository } from './analytics.repository';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsRepository,
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
  exports: [AnalyticsRepository, AnalyticsService],
})
export class AnalyticsModule {}
