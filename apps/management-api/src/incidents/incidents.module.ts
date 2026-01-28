import { Module } from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { IncidentsController } from './incidents.controller';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [IncidentsController],
  providers: [IncidentsService],
})
export class IncidentsModule {}
