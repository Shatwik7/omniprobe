import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { DatabaseModule } from '@app/database';
import { LongPollingModule } from '@app/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';

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
    })
  ],
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule { }
