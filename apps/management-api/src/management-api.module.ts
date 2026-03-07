import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from '@app/database';
import { ConfigModule } from '@nestjs/config';
import { TeamsModule } from './teams/teams.module';
import { ProjectsModule } from './projects/projects.module';
import { MonitorsModule } from './monitors/monitors.module';
import { MetricsModule } from './metrics/metrics.module';
import { IncidentsModule } from './incidents/incidents.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AlertPolicyModule } from './alert-policy/alert-policy.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    UsersModule,
    AuthModule,
    TeamsModule,
    ProjectsModule,
    MonitorsModule,
    MetricsModule,
    IncidentsModule,
    NotificationsModule,
    AlertPolicyModule,
  ],
})
export class ManagementApiModule {}
