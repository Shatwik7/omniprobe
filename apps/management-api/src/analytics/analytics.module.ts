import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '../auth/auth.module';
import { LongPollingModule } from '@app/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    AuthModule,
    LongPollingModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redisUrl: config.get<string>('REDIS_URL') || 'redis://localhost:6379',
      }),
    }),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
