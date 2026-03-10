import { Module } from '@nestjs/common';
import { AlertPolicyService } from './alert-policy.service';
import { AlertPolicyController } from './alert-policy.controller';
import { DatabaseModule, AlertPolicy } from '@app/database';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertPolicyRepository } from './alert-policy.repository';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [AuthModule,ConfigModule, DatabaseModule],
  controllers: [AlertPolicyController],
  providers: [AlertPolicyService, AlertPolicyRepository],
})
export class AlertPolicyModule {}
