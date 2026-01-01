import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from '@app/database';
import { ConfigModule } from '@nestjs/config';
import { TeamsModule } from './teams/teams.module';
import { ProjectsModule } from './projects/projects.module';
import { MonitorsModule } from './monitors/monitors.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [ConfigModule,UsersModule,AuthModule,DatabaseModule,TeamsModule, ProjectsModule, MonitorsModule, MetricsModule],
})
export class ManagementApiModule {}
