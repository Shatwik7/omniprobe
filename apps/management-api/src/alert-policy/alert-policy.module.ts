import { Module } from '@nestjs/common';
import { AlertPolicyService } from './alert-policy.service';
import { AlertPolicyController } from './alert-policy.controller';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule,DatabaseModule],
  controllers: [AlertPolicyController],
  providers: [AlertPolicyService],
})
export class AlertPolicyModule {}
