import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { Team } from './entity/team.entity';
import { Project } from './entity/project.entity';
import { AlertPolicy } from './entity/alert-policy.entity';
import { Incident } from './entity/incident.entity';
import { Metric } from './entity/metric.entity';
import { Monitor } from './entity/monitor.entity';

@Module({
  imports: [
     TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('POSTGRES_HOST'),
        port: config.get<number>('POSTGRES_PORT'),
        username: config.get<string>('POSTGRES_USER'),
        password: config.get<string>('POSTGRES_PASSWORD'),
        database: config.get<string>('POSTGRES_DB'),
        entities: [User, Team, Project, AlertPolicy, Incident, Metric, Monitor, Notification],
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([User, Team, Project, AlertPolicy, Incident, Metric, Monitor, Notification])
  ],
})
export class DatabaseModule {}