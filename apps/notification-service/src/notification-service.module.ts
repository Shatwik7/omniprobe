import { Module } from '@nestjs/common';
import { NotificationServiceController } from './notification-service.controller';
import { NotificationServiceService } from './notification-service.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule, Notification } from '@app/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from './notification-providers/Email.service';
import { RateLimiterModule } from 'nestjs-rate-limiter';
import { WebHookService } from './notification-providers/WebHook.service';
import { LongPollingModule } from '@app/common/long-polling/long-polling.module';
import { SlackService } from './notification-providers/Slack.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    RateLimiterModule.register({
      points: 10, // 10 requests
      duration: 1 * 60 * 1000, // per 1 minute
    }),
    LongPollingModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redisUrl: config.get<string>('REDIS_URL') || 'redis://localhost:6379',
      }),
    })
  ],
  controllers: [NotificationServiceController],
  providers: [NotificationServiceService, EmailService, WebHookService, SlackService],
})
export class NotificationServiceModule { }
